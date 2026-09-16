import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  ChevronLeft, Loader2, Grid3x3, Palette, Code2, Megaphone,
  PenLine, Video, Sparkles, Music, Briefcase, Users,
  MapPin, PlusCircle, UserCircle2, LogOut, Search, Compass, Tag, HelpCircle, Coins,
  Sun, Moon
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { CATEGORY_VISUALS, CATEGORY_SHORT_LABELS } from "@/lib/catalogFilters";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import NotificationBell from "@/components/NotificationBell";
import AuthModal from "@/components/AuthModal";
export { default as Breadcrumbs } from "@/components/Breadcrumbs";
export { default as ProfileProgressBar } from "@/components/ProfileProgressBar";
export { default as MilestoneTracker } from "@/components/MilestoneTracker";
export { default as RatingBreakdown } from "@/components/RatingBreakdown";
export { default as EscrowWalletModal } from "@/components/EscrowWalletModal";
export { default as BoostPreviewModal } from "@/components/BoostPreviewModal";
export { default as AuthModal } from "@/components/AuthModal";
export * from "@/components/Skeletons";

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

// Global Full-Screen Navigation Header
export function GlobalNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [authOpen, setAuthOpen] = useState(false);

  const links = [
    { label: "EXPLORE PROS", path: "/employer", testId: "nav-pros" },
    { label: "FIND GIGS", path: "/freelancer/jobs", testId: "nav-gigs" },
    { label: "LIVE MAP", path: "/map", testId: "nav-map" },
    { label: "CATEGORIES", path: "/categories", testId: "nav-categories" },
    { label: "PLANS", path: "/employer/plans", testId: "nav-plans" },
  ];

  return (
    <>
      <header className="w-full border-b-2 border-ink bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/workhop-logo.png"
              alt="WorkHop"
              className="h-9 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <span className="hidden sm:inline-block border-2 border-ink bg-brand px-2 py-0.5 text-[10px] font-black tracking-widest text-white shadow-[1.5px_1.5px_0px_#121212]">
              HYPERLOCAL
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {links.map((link) => {
              const active = loc.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={link.testId}
                  className={`text-xs font-black tracking-wider transition ${
                    active
                      ? "text-brand underline decoration-2 underline-offset-4"
                      : "text-ink hover:text-brand"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center gap-2">
            {/* Free Credits Badge */}
            <Link
              to="/employer/plans"
              className="hidden md:flex items-center gap-1 border-2 border-ink bg-sand px-2.5 py-1 text-[11px] font-black text-ink hover:bg-stone transition"
              title="Your active credits"
            >
              <Coins size={14} className="text-brand" />
              <span>5 CREDITS</span>
            </Link>

            {/* In-App Notification Bell */}
            <NotificationBell />

            {/* Dark / Light Mode Toggle */}
            <button
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-sand hover:bg-stone transition-transform active:translate-y-0.5"
            >
              {isDark ? <Sun size={16} className="text-brand" /> : <Moon size={16} className="text-ink" />}
            </button>

            <button
              data-testid="nav-post-job-btn"
              onClick={() => nav("/employer/post-job")}
              className="flex items-center gap-1.5 border-2 border-ink bg-brand px-4 py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <PlusCircle size={15} />
              <span className="hidden sm:inline">POST JOB</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  data-testid="nav-profile-btn"
                  onClick={() => nav("/profile")}
                  className="flex items-center gap-1.5 border-2 border-ink bg-white px-3 py-2 text-xs font-extrabold text-ink hover:bg-sand"
                >
                  <UserCircle2 size={16} className="text-brand" />
                  <span className="max-w-[100px] truncate text-xs sm:max-w-[140px]">{user.name || user.email?.split("@")[0]}</span>
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
              <button
                data-testid="nav-signin-btn"
                onClick={() => setAuthOpen(true)}
                className="border-2 border-ink bg-ink px-4 py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                SIGN IN
              </button>
            )}
          </div>
        </div>
      </header>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

// Sticky page header bar with optional back button + right slot
export function TopBar({ title, sub, right, onBack, backTestID = "topbar-back-btn" }) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-20 w-full border-b-2 border-ink bg-white">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-8">
        {onBack !== false && (
          <button
            data-testid={backTestID}
            onClick={typeof onBack === "function" ? onBack : () => nav(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-white transition hover:bg-sand active:translate-y-0.5"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black tracking-tight text-ink sm:text-lg">{title}</h1>
          {sub && <p className="truncate text-[11px] font-semibold text-inkmuted">{sub}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

// Shell component (Full width responsive container)
export function Shell({ children, className = "" }) {
  return (
    <div className={`min-h-screen w-full bg-white text-ink ${className}`}>
      <GlobalNav />
      <main className="w-full">{children}</main>
    </div>
  );
}

// Horizontal scrollable 9-category filters
export function CategoryTiles({ selected, onSelect, testIDPrefix = "cat-tile" }) {
  const [cats, setCats] = useState(["ALL"]);
  useEffect(() => {
    apiGet("/catalog")
      .then((d) => {
        if (Array.isArray(d)) setCats(["ALL", ...d.map((c) => c.category)]);
      })
      .catch(() => {});
  }, []);
  return (
    <div className="w-full border-b-2 border-ink bg-white">
      <div className="wh-scroll mx-auto flex w-full max-w-[1600px] gap-3 overflow-x-auto px-4 py-3 sm:px-8">
        {cats.map((key) => {
          const v = CATEGORY_VISUALS[key] || CATEGORY_VISUALS.ALL;
          const on = selected === key;
          return (
            <button
              key={key}
              data-testid={`${testIDPrefix}-${key.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              onClick={() => onSelect(key)}
              className={`flex w-[100px] shrink-0 flex-col items-center gap-1.5 border-2 border-ink p-2.5 transition-transform active:translate-y-0.5 ${on ? "bg-ink" : "bg-white hover:bg-sand"}`}
            >
              <span
                className="flex h-10 w-10 items-center justify-center border-2 border-ink"
                style={{ background: on ? "#E65A1E" : v.bg }}
              >
                <CatIcon name={v.icon} size={20} className={on ? "text-white" : "text-[#121212]"} />
              </span>
              <span className={`text-center text-[10px] font-black leading-tight ${on ? "text-white dark:text-black" : "text-ink"}`}>
                {(CATEGORY_SHORT_LABELS[key] || key).toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Empty / not-found block
export function EmptyBlock({ icon, title, sub, action, testID }) {
  return (
    <div data-testid={testID} className="flex flex-col items-center gap-3 py-16 text-center border-2 border-dashed border-ink/20 bg-sand/50 p-8 my-6">
      <div className="flex h-16 w-16 items-center justify-center border-2 border-ink bg-white shadow-[2px_2px_0px_#121212]">{icon}</div>
      <h3 className="text-base font-black text-ink">{title}</h3>
      {sub && <p className="max-w-xs text-xs text-inkmuted">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
