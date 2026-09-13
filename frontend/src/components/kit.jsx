import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  ChevronLeft, Loader2, Grid3x3, Palette, Code2, Megaphone,
  PenLine, Video, Sparkles, Music, Briefcase, Users,
  MapPin, PlusCircle, UserCircle2, LogOut, Search, Compass, Tag, HelpCircle
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { CATEGORY_VISUALS, CATEGORY_SHORT_LABELS } from "@/lib/catalogFilters";
import { useAuth } from "@/context/AuthContext";

const ICONS = {
  grid: Grid3x3, palette: Palette, code: Code2, megaphone: Megaphone,
  pen: PenLine, video: Video, sparkles: Sparkles, music: Music,
  briefcase: Briefcase, users: Users,
};

export function CatIcon({ name, ...props }) {
  const C = ICONS[name] || Grid3x3;
  return <C {...props} />;
}

export function Spinner({ className = "" }) {
  return <Loader2 className={`animate-spin text-ink ${className}`} size={22} />;
}

export function IconBtn({ onClick, children, testID, className = "", active = false, title = "" }) {
  return (
    <button
      data-testid={testID}
      onClick={onClick}
      title={title}
      className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink transition-transform active:translate-y-0.5 ${active ? "bg-brand" : "bg-white hover:bg-sand"} ${className}`}
    >
      {children}
    </button>
  );
}

// Global Landscape Navigation Header for all desktop screens
export function GlobalNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();

  const links = [
    { label: "EXPLORE PROS", path: "/employer", testId: "nav-pros" },
    { label: "FIND GIGS", path: "/freelancer/jobs", testId: "nav-gigs" },
    { label: "LIVE MAP", path: "/map", testId: "nav-map" },
    { label: "CATEGORIES", path: "/categories", testId: "nav-categories" },
    { label: "PLANS", path: "/employer/plans", testId: "nav-plans" },
  ];

  return (
    <header className="border-b-2 border-ink bg-white px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/workhop-logo.png"
            alt="WorkHop"
            className="h-8 w-auto select-none"
            draggable={false}
          />
          <span className="hidden rounded bg-brand px-1.5 py-0.5 text-[9px] font-black tracking-widest text-white md:inline-block">
            HYPERLOCAL
          </span>
        </Link>

        {/* Desktop Landscape Nav Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = loc.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                data-testid={link.testId}
                className={`border-b-2 px-3 py-1.5 text-xs font-black tracking-wider transition ${
                  active
                    ? "border-brand bg-sand text-ink"
                    : "border-transparent text-inkmuted hover:border-ink hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          <button
            data-testid="nav-post-job-btn"
            onClick={() => nav("/employer/post-job")}
            className="flex items-center gap-1.5 border-2 border-ink bg-brand px-3 py-1.5 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
          >
            <PlusCircle size={15} />
            <span className="hidden sm:inline">POST JOB</span>
          </button>

          {user ? (
            <div className="flex items-center gap-1">
              <button
                data-testid="nav-profile-btn"
                onClick={() => nav("/profile")}
                className="flex items-center gap-1.5 border-2 border-ink bg-white px-2.5 py-1.5 text-xs font-extrabold text-ink hover:bg-sand"
              >
                <UserCircle2 size={16} className="text-brand" />
                <span className="max-w-[100px] truncate text-[11px] sm:max-w-[140px]">{user.name || user.email?.split("@")[0]}</span>
              </button>
              <button
                data-testid="nav-logout-btn"
                onClick={logout}
                title="Logout"
                className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-white hover:bg-sand"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link
              to="/"
              className="border-2 border-ink bg-ink px-3 py-1.5 text-xs font-black tracking-wider text-white"
            >
              SIGN IN
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

// Sticky page header bar with optional back button + right slot
export function TopBar({ title, sub, onBack, right, backTestID = "back-btn" }) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b-2 border-ink bg-white px-4 py-3 sm:px-6">
      {onBack !== false && (
        <IconBtn testID={backTestID} onClick={onBack || (() => nav(-1))}>
          <ChevronLeft size={22} className="text-ink" />
        </IconBtn>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-black tracking-[0.12em] text-ink sm:text-lg">{title}</h1>
        {sub != null && <p className="truncate text-xs text-inkmuted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// Responsive Landscape Shell (max-w-6xl)
export function Shell({ children, max = "max-w-6xl", showNav = true }) {
  return (
    <div className="min-h-screen bg-[#F4F4F0] text-ink">
      <div className={`mx-auto ${max} min-h-screen border-x-2 border-ink bg-white shadow-xl`}>
        {showNav && <GlobalNav />}
        <main>{children}</main>
      </div>
    </div>
  );
}

// Horizontal illustrated category tiles (fetches /api/catalog for names)
export function CategoryTiles({ selected, onSelect, testIDPrefix = "cat-tile" }) {
  const [cats, setCats] = useState(["ALL"]);
  useEffect(() => {
    apiGet("/catalog")
      .then((d) => setCats(["ALL", ...(d || []).map((c) => c.category)]))
      .catch(() => {});
  }, []);
  return (
    <div className="wh-scroll flex gap-3 overflow-x-auto border-b-2 border-ink bg-white px-4 py-3 sm:px-6">
      {cats.map((key) => {
        const v = CATEGORY_VISUALS[key] || CATEGORY_VISUALS.ALL;
        const on = selected === key;
        return (
          <button
            key={key}
            data-testid={`${testIDPrefix}-${key.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            onClick={() => onSelect(key)}
            className={`flex w-[96px] shrink-0 flex-col items-center gap-1.5 border-2 border-ink p-2 transition-transform active:translate-y-0.5 ${on ? "bg-ink" : "bg-white hover:bg-sand"}`}
          >
            <span
              className="flex h-10 w-10 items-center justify-center border-2 border-ink"
              style={{ background: on ? "#FF5A00" : v.bg }}
            >
              <CatIcon name={v.icon} size={20} className="text-ink" />
            </span>
            <span className={`text-center text-[10px] font-black leading-tight ${on ? "text-white" : "text-ink"}`}>
              {(CATEGORY_SHORT_LABELS[key] || key).toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Empty / not-found block
export function EmptyBlock({ icon, title, sub, action, testID }) {
  return (
    <div data-testid={testID} className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center border-2 border-ink bg-sand">{icon}</div>
      <h3 className="text-base font-black text-ink">{title}</h3>
      {sub && <p className="max-w-xs text-xs text-inkmuted">{sub}</p>}
      {action}
    </div>
  );
}
