import { lazy, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Compass, Layers, LogOut, MapPin, MapPinned, RotateCcw, ShieldCheck } from "lucide-react";
import { api } from "./api";
import { useSession } from "./session";
import SignIn from "./pages/SignIn";
import { Spinner } from "./components/ui";
import { Mark } from "./components/Mark";
import { AskLauncher } from "./components/Ask";

// each step of the flow loads when the officer reaches it; sign-in stays light
const Setup = lazy(() => import("./pages/Setup"));
const Home = lazy(() => import("./pages/Home"));
const Inbox = lazy(() => import("./pages/Inbox"));
const CasePage = lazy(() => import("./pages/Case"));
const Checklist = lazy(() => import("./pages/Checklist"));
const Ledger = lazy(() => import("./pages/Ledger"));

const Loading = () => <main className="page"><div className="center-spin"><Spinner size={22} /></div></main>;

function OfficerMenu() {
  const { me, set, signOut } = useSession();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (!me) return null;
  const ready = me.area?.status === "ready";

  const changeArea = async () => {
    setOpen(false);
    set(await api.joinArea(null));
    nav("/setup");
  };
  const reset = async () => {
    setOpen(false);
    await api.reset();
    window.location.assign(loc.pathname.startsWith("/case") ? "/cases" : loc.pathname);
  };
  const out = async () => {
    setOpen(false);
    await signOut();
    nav("/signin", { replace: true });
  };

  return (
    <div className="menu" ref={box}>
      <button type="button" className="menu-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar" aria-hidden>{me.officer.name.slice(0, 1).toUpperCase()}</span>
        <span className="menu-name">{me.officer.name}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <div className="menu-who"><strong>{me.officer.name}</strong><small>@{me.officer.username}</small></div>
          {!me.officer.demo && <button type="button" role="menuitem" onClick={changeArea}><MapPinned size={14} aria-hidden /> Change area</button>}
          {ready && <button type="button" role="menuitem" onClick={reset} title="Clear recorded findings and stored narratives in this area"><RotateCcw size={14} aria-hidden /> Reset findings</button>}
          <button type="button" role="menuitem" onClick={out}><LogOut size={14} aria-hidden /> Sign out</button>
        </div>
      )}
    </div>
  );
}

function LeftRail() {
  const { me } = useSession();
  const loc = useLocation();
  if (loc.pathname === "/signin") return null;
  const area = me?.area;
  const ready = area?.status === "ready";
  return (
    <aside className="appbar" aria-label="Bhumi Ecological Observatory navigation">
      <div className="appbar-inner">
        <Link to={me ? "/" : "/signin"} className="wordmark" aria-label="Bhumi home">
          <Mark size={28} />
          <span className="wordmark-text">
            <strong>Bhumi</strong>
            <small>भूमि · dMRV Observatory</small>
          </span>
        </Link>

        {ready && (
          <nav className="appnav" aria-label="Main">
            <NavLink to="/" end>
              <Compass size={16} aria-hidden />
              <span>Observatory</span>
            </NavLink>
            <NavLink to="/cases">
              <Layers size={16} aria-hidden />
              <span>Triage Queue</span>
            </NavLink>
            <NavLink to="/ledger">
              <ShieldCheck size={16} aria-hidden />
              <span>dMRV Ledger</span>
            </NavLink>
          </nav>
        )}

        <span className="appbar-spacer" />

        <div className="rail-sepolia" title="Ethereum Sepolia Testnet (Chain ID 11155111) · SHA-256 Merkle dMRV">
          <span className="rail-sepolia-dot" aria-hidden />
          <div>
            <strong>Sepolia · 11155111</strong>
            <small>SHA-256 Merkle dMRV</small>
          </div>
        </div>

        {area && (
          <span className="area-chip" title={area.region}>
            <MapPin size={13} aria-hidden />
            <span>
              <strong>{area.name}</strong>
              {ready && area.fields ? <small>{area.fields} parcels watched</small> : <small>{area.status === "ready" ? "" : "setting up"}</small>}
            </span>
          </span>
        )}
        <OfficerMenu />
      </div>
    </aside>
  );
}

/** Signed in, with an area that is ready: otherwise send the officer to the step they are on. */
function Gate({ need, children }: { need: "session" | "area" | "ready"; children: ReactNode }) {
  const { me, loading } = useSession();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!me) return <Navigate to="/signin" replace state={{ from: loc.pathname }} />;
  if (need !== "session" && !me.area) return <Navigate to="/setup" replace />;
  if (need === "ready" && me.area?.status !== "ready") return <Navigate to="/" replace />;
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function SignInRoute() {
  const { me, loading } = useSession();
  if (loading) return null;
  if (me) return <Navigate to={me.area ? "/" : "/setup"} replace />;
  return <SignIn />;
}

export default function App() {
  const loc = useLocation();
  const isSignIn = loc.pathname === "/signin";
  return (
    <div className={isSignIn ? "shell-gate" : "app-shell"}>
      <a href="#main" className="skip">Skip to content</a>
      <LeftRail />
      <div id="main" className="app-main">
        <Routes>
          <Route path="/signin" element={<SignInRoute />} />
          <Route path="/setup" element={<Gate need="session"><Setup /></Gate>} />
          <Route path="/" element={<Gate need="area"><Home /></Gate>} />
          <Route path="/cases" element={<Gate need="ready"><Inbox /></Gate>} />
          <Route path="/ledger" element={<Gate need="ready"><Ledger /></Gate>} />
          <Route path="/case/:id" element={<Gate need="ready"><CasePage /></Gate>} />
          <Route path="/case/:id/check" element={<Gate need="ready"><Checklist /></Gate>} />
          <Route path="*" element={<main className="page"><p>Page not found. <Link to="/">Back to observatory</Link></p></main>} />
        </Routes>
      </div>
      <AskLauncher />
    </div>
  );
}
