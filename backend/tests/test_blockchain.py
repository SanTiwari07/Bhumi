"""Cryptographic dMRV proof engine tests: Merkle trees, IEEE-1 parcel commitments,
IEEE-2 epoch nullifiers, and Ethereum Sepolia (chainId: 11155111) attestation endpoints."""
from app import blockchain


def test_merkle_tree_inclusion_proofs_and_tamper_detection():
    leaves = [
        blockchain._sha256_hex(f"leaf-{i}")
        for i in range(5)
    ]
    tree = blockchain.build_merkle_tree(leaves)
    assert tree["root"].startswith("0x") and len(tree["root"]) == 66
    for idx, lh in enumerate(leaves):
        assert blockchain.verify_merkle_proof(lh, tree["proofs"][idx], tree["root"])
        # Tampering with a leaf hash must fail verification against the root
        tampered = lh[:-1] + ("0" if lh[-1] != "0" else "1")
        assert not blockchain.verify_merkle_proof(tampered, tree["proofs"][idx], tree["root"])


def test_ieee1_privacy_preserving_parcel_commitment_and_ieee2_nullifier():
    p1 = blockchain.parcel_commitment("niphad", "F128")
    p2 = blockchain.parcel_commitment("niphad", "F128")
    p_other = blockchain.parcel_commitment("niphad", "F094")

    assert p1["commitment"] == p2["commitment"]
    assert p1["commitment"] != p_other["commitment"]
    assert p1["utm_zone"].endswith("N")
    assert "±100 m grid" in p1["quantized_cell"]

    n1 = blockchain.epoch_nullifier(p1["commitment"], "2026-04-02")
    n2 = blockchain.epoch_nullifier(p1["commitment"], "2026-04-02")
    n_diff_pass = blockchain.epoch_nullifier(p1["commitment"], "2026-04-07")
    assert n1 == n2
    assert n1 != n_diff_pass


def test_case_proof_verify_and_sepolia_ledger_routes(client):
    # 1. Fetch case proof for F128
    r = client.get("/api/cases/F128/proof")
    assert r.status_code == 200
    proof = r.json()
    assert proof["case_id"] == "F128"
    assert proof["network"]["chain_id"] == 11155111
    assert proof["leaf_count"] >= 5
    assert all(leaf["verified"] for leaf in proof["leaves"])
    assert len(proof["ieee_references"]) == 3

    # 2. Run cryptographic verification endpoint
    vr = client.post("/api/cases/F128/verify")
    assert vr.status_code == 200
    vbody = vr.json()
    assert vbody["verified"] is True
    assert vbody["all_leaves_valid"] is True
    assert vbody["nullifier_valid"] is True
    assert vbody["genesis_root_matches_satellite_pipeline"] is True

    # 3. Record a Sepolia transaction anchor
    tx_res = client.post(
        "/api/cases/F128/anchor-tx",
        json={
            "tx_hash": "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
            "merkle_root": proof["evidence_root"],
            "chain_id": 11155111,
            "signer": "0x71C95911E9a5D330f4D621842EC243EE1343292e",
            "block_number": 7845120,
        },
    )
    assert tx_res.status_code == 200
    assert tx_res.json()["ok"] is True

    # 4. Verify ledger endpoint includes area Merkle root and anchored transaction
    lr = client.get("/api/ledger")
    assert lr.status_code == 200
    ledger = lr.json()
    assert ledger["area_merkle_root"].startswith("0x")
    assert ledger["total_cases"] == len(ledger["entries"])
    assert any(a["case_id"] == "F128" for a in ledger["sepolia_anchors"])
