// Compiles BhumiClimateRegistry.sol with solc-js and runs it in an in-memory EVM.
// Nothing is deployed to a network. Run from contracts/: npm install && npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import solc from "solc";
import { VM } from "@ethereumjs/vm";
import { Address, bytesToHex, hexToBytes } from "@ethereumjs/util";
import { Interface, keccak256, solidityPacked, zeroPadValue } from "ethers";

const SOURCE = "BhumiClimateRegistry.sol";
const CALLER = Address.fromString("0x00000000000000000000000000000000000b0b01");

let iface;
let vm;
let registry;

function compile() {
  const content = readFileSync(fileURLToPath(new URL(`../${SOURCE}`, import.meta.url)), "utf8");
  const input = {
    language: "Solidity",
    sources: { [SOURCE]: { content } },
    settings: {
      // The registry hits stack-too-deep in the legacy pipeline, so it needs the IR pipeline.
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((e) => e.severity === "error");
  assert.deepEqual(errors, [], errors.map((e) => e.formattedMessage).join("\n"));
  return output.contracts[SOURCE].BhumiClimateRegistry;
}

async function call(fn, args) {
  const result = await vm.evm.runCall({
    caller: CALLER,
    to: registry,
    data: hexToBytes(iface.encodeFunctionData(fn, args)),
    gasLimit: 10_000_000n,
  });
  return result.execResult;
}

function attestArgs({ caseId = "F128", nullifier, newRoot }) {
  const parcelCommitment = zeroPadValue("0x01", 32);
  return [
    "niphad",
    caseId,
    parcelCommitment,
    zeroPadValue("0x00", 32),
    newRoot,
    nullifier,
    "satellite_triage",
    "water_stress",
  ];
}

before(async () => {
  const artifact = compile();
  iface = new Interface(artifact.abi);
  vm = await VM.create();
  const deployed = await vm.evm.runCall({
    caller: CALLER,
    data: hexToBytes(`0x${artifact.evm.bytecode.object}`),
    gasLimit: 10_000_000n,
  });
  assert.equal(deployed.execResult.exceptionError, undefined);
  registry = deployed.createdAddress;
});

test("first attestFieldFinding marks the season marker as used", async () => {
  const nullifier = keccak256(solidityPacked(["bytes32", "string"], [zeroPadValue("0x01", 32), "2026-04-02"]));
  const res = await call("attestFieldFinding", attestArgs({ nullifier, newRoot: zeroPadValue("0xaa", 32) }));
  assert.equal(res.exceptionError, undefined);
  assert.equal(res.logs.length, 1, "FieldFindingAttested is emitted");

  const used = await call("nullifierUsed", [nullifier]);
  assert.equal(iface.decodeFunctionResult("nullifierUsed", bytesToHex(used.returnValue))[0], true);
});

test("second attestFieldFinding with the same season marker reverts with NullifierAlreadyUsed", async () => {
  const nullifier = keccak256(solidityPacked(["bytes32", "string"], [zeroPadValue("0x01", 32), "2026-04-07"]));
  const first = await call("attestFieldFinding", attestArgs({ nullifier, newRoot: zeroPadValue("0xbb", 32) }));
  assert.equal(first.exceptionError, undefined);

  // Same nullifier, different case and root: still a double count, so it must revert.
  const second = await call(
    "attestFieldFinding",
    attestArgs({ caseId: "F129", nullifier, newRoot: zeroPadValue("0xcc", 32) }),
  );
  assert.equal(second.exceptionError?.error, "revert");
  const err = iface.parseError(bytesToHex(second.returnValue));
  assert.equal(err.name, "NullifierAlreadyUsed");
  assert.equal(err.args[0], nullifier);

  // The revert left the first attestation in place and stored nothing for F129.
  const kept = await call("verifyCaseRoot", ["niphad", "F128", zeroPadValue("0xbb", 32)]);
  assert.equal(iface.decodeFunctionResult("verifyCaseRoot", bytesToHex(kept.returnValue))[0], true);
  const rejected = await call("verifyCaseRoot", ["niphad", "F129", zeroPadValue("0xcc", 32)]);
  assert.equal(iface.decodeFunctionResult("verifyCaseRoot", bytesToHex(rejected.returnValue))[0], false);
});
