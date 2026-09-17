import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  ChevronLeft, Loader2, Grid3x3, Palette, Code2, Megaphone,
  PenLine, Video, Sparkles, Music, Briefcase, Users,
  MapPin, PlusCircle, UserCircle2, LogOut, Search, Compass, Tag, HelpCircle, Coins,
  Sun, Moon, Menu, X, Home, Shield, FileText, ArrowRight
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
export { default as RecaptchaWidget } from "@/components/RecaptchaWidget";
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

export function Logo({ size = "default", className = "" }) {
  if (size === "header") {
    return (
      <div className={`flex items-center gap-2 sm:gap-2.5 group select-none ${className}`} data-testid="landing-logo">
        {/* Aesthetic Circular Emblem Badge */}
        <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink dark:border-white/80 bg-white p-0.5 shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#E65A1E] overflow-hidden transition-transform duration-200 group-hover:scale-105">
          <img
            src="/workhop-logo.png"
            alt="WorkHop Emblem"
            className="h-full w-full object-cover object-top scale-125"
            draggable={false}
          />
        </div>

        {/* Brand Lockup */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1 leading-none">
            <span className="text-base sm:text-lg font-black tracking-tight text-ink dark:text-white">
              WORK<span className="text-brand">HOP</span>
            </span>
          </div>
          <span className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-[0.12em] text-inkmuted dark:text-stone-400 mt-0.5">
            Bengaluru Gig Network
          </span>
        </div>
      </div>
    );
  }

  // Large / Hero variant
  return (
    <div className={`flex flex-col items-center sm:items-start group select-none ${className}`} data-testid="landing-logo">
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full border-2 border-ink dark:border-white/80 bg-white p-1 shadow-[3px_3px_0px_#121212] dark:shadow-[3px_3px_0px_#E65A1E] overflow-hidden transition-transform duration-200 group-hover:scale-105">
          <img
            src="/workhop-logo.png"
            alt="WorkHop Emblem"
            className="h-full w-full object-cover object-top scale-125"
            draggable={false}
          />
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-ink dark:text-white">
              WORK<span className="text-brand">HOP</span>
            </span>
          </div>
          <span className="text-[9.5px] font-black tracking-wider text-brand uppercase">
            Hyperlocal Talent Network
          </span>
        </div>
      </div>
      <span className="mt-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-inkmuted dark:text-stone-400">
        your next local gig, one minute away
      </span>
    </div>
  );
}

// Global Navigation Header with Mobile Drawer Menu
export function GlobalNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [loc.pathname]);

  const userRole = user ? (user.role || localStorage.getItem("workhop_auth_role") || "freelancer").toLowerCase() : null;
  const isEmployer = Boolean(user && (userRole?.includes("employ") || userRole?.includes("client")));
  const isFreelancer = Boolean(user && !isEmployer);

  const allLinks = [
    { label: "EXPLORE PROS", path: "/employer", testId: "nav-pros", icon: Users, forRole: "employer" },
    { label: "FIND GIGS", path: "/freelancer/jobs", testId: "nav-gigs", icon: Briefcase, forRole: "freelancer" },
    { label: "LIVE MAP", path: "/map", testId: "nav-map", icon: MapPin },
    { label: "CATEGORIES", path: "/categories", testId: "nav-categories", icon: Grid3x3 },
    { label: "PLANS", path: "/employer/plans", testId: "nav-plans", icon: Coins },
  ];

  const links = allLinks.filter((link) => {
    if (!user) return true; // Show both if not signed in
    if (link.forRole === "employer") return isEmployer;
    if (link.forRole === "freelancer") return isFreelancer;
    return true;
  });

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b-2 border-ink bg-white dark:bg-[#121212]">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-3 py-2.5 sm:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <Logo size="header" />
          </Link>

          {/* Desktop Nav Links */}
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
                      : "text-ink dark:text-stone-300 hover:text-brand"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Free Credits Badge (Desktop) */}
            <Link
              to="/employer/plans"
              className="hidden md:flex items-center gap-1 border-2 border-ink bg-sand dark:bg-[#222] px-2.5 py-1 text-[11px] font-black text-ink dark:text-white hover:bg-stone transition"
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
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border-2 border-ink bg-sand dark:bg-[#222] hover:bg-stone transition-transform active:translate-y-0.5"
            >
              {isDark ? <Sun size={15} className="text-brand" /> : <Moon size={15} className="text-ink" />}
            </button>

            {/* Post Job Button (Desktop/Tablet) */}
            <button
              data-testid="nav-post-job-btn"
              onClick={() => nav("/employer/post-job")}
              className="hidden sm:flex items-center gap-1.5 border-2 border-ink bg-brand px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <PlusCircle size={14} />
              <span>POST JOB</span>
            </button>

            {/* User Account or Sign In Button (Desktop) */}
            {user ? (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  data-testid="nav-profile-btn"
                  onClick={() => nav("/profile")}
                  className="flex items-center gap-1.5 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-extrabold text-ink dark:text-white hover:bg-sand"
                >
                  <UserCircle2 size={15} className="text-brand" />
                  <span className="max-w-[90px] truncate sm:max-w-[130px]">{user.name || user.email?.split("@")[0]}</span>
                </button>
                <button
                  data-testid="nav-logout-btn"
                  onClick={logout}
                  title="Logout"
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border-2 border-ink bg-white dark:bg-[#1a1a1a] hover:bg-sand"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                data-testid="nav-signin-btn"
                onClick={() => {
                  setAuthMode("signin");
                  setAuthOpen(true);
                }}
                className="hidden sm:flex border-2 border-ink bg-ink px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                SIGN IN
              </button>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              data-testid="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex lg:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border-2 border-ink bg-sand dark:bg-[#222] text-ink dark:text-white hover:bg-stone transition-transform active:translate-y-0.5"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SLIDE-OUT DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[1000] flex lg:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Body */}
          <div className="relative ml-auto flex h-full w-[85%] max-w-sm flex-col border-l-2 border-ink bg-white dark:bg-[#121212] p-5 shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b-2 border-ink pb-4">
              <Logo size="header" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-sand dark:bg-[#222] text-ink dark:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* User Account / Auth Card */}
            <div className="mt-4 border-2 border-ink bg-sand dark:bg-[#1a1a1a] p-3 shadow-[2px_2px_0px_#121212]">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink bg-brand text-xs font-black text-white">
                      {(user.name || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-ink dark:text-white truncate max-w-[140px]">
                        {user.name || user.email?.split("@")[0]}
                      </span>
                      <span className="text-[10px] text-inkmuted dark:text-stone-400 capitalize">
                        {user.role || "Member"} · BLR
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="border border-ink bg-white dark:bg-[#222] p-1.5 text-xs font-black text-danger hover:bg-stone"
                    title="Logout"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-center">
                  <span className="text-xs font-black text-ink dark:text-white">
                    Unlock Instant Local Hiring
                  </span>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthMode("signin");
                      setAuthOpen(true);
                    }}
                    className="w-full border-2 border-ink bg-brand py-2 text-xs font-black tracking-wider text-white shadow-[1.5px_1.5px_0px_#121212]"
                  >
                    SIGN IN / SIGN UP
                  </button>
                </div>
              )}
            </div>

            {/* Main Navigation Links */}
            <div className="mt-4 flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 mb-1">
                Explore WorkHop
              </span>
              {links.map((link) => {
                const Icon = link.icon;
                const active = loc.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between border-2 border-ink p-2.5 text-xs font-black transition ${
                      active
                        ? "bg-ink text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_#E65A1E]"
                        : "bg-white dark:bg-[#1a1a1a] text-ink dark:text-white hover:bg-sand"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} className={active ? "text-brand" : "text-inkmuted dark:text-stone-400"} />
                      <span>{link.label}</span>
                    </div>
                    <ArrowRight size={13} />
                  </Link>
                );
              })}

              {/* Quick Post Job Action */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  nav("/employer/post-job");
                }}
                className="mt-2 flex items-center justify-center gap-2 border-2 border-ink bg-brand py-3 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212]"
              >
                <PlusCircle size={15} />
                <span>POST A GIG (FROM ₹299)</span>
              </button>
            </div>

            {/* Secondary Pages & Links */}
            <div className="mt-6 flex flex-col gap-2 border-t-2 border-dashed border-ink/20 pt-4 text-xs font-bold">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-ink dark:text-stone-300 hover:text-brand"
              >
                <UserCircle2 size={15} className="text-brand" />
                <span>My Profile &amp; Gigs</span>
              </Link>
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-ink dark:text-stone-300 hover:text-brand"
              >
                <HelpCircle size={15} className="text-brand" />
                <span>Help &amp; Support</span>
              </Link>
              <Link
                to="/legal"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-ink dark:text-stone-300 hover:text-brand"
              >
                <FileText size={15} className="text-brand" />
                <span>Terms of Service &amp; Legal</span>
              </Link>
            </div>

            {/* Footer info in drawer */}
            <div className="mt-auto pt-6 text-center text-[10px] text-inkmuted dark:text-stone-400">
              <p className="font-black">WORKHOP BENGALURU</p>
              <p className="mt-0.5">Hyperlocal Freelance Platform · v2.0</p>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </>
  );
}

// Mobile Bottom Navigation Bar component
export function MobileBottomNav() {
  const loc = useLocation();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");

  const tabs = [
    { label: "Home", path: "/", icon: Home, testId: "bottom-nav-home" },
    { label: "Pros", path: "/employer", icon: Users, testId: "bottom-nav-pros" },
    { label: "Gigs", path: "/freelancer/jobs", icon: Briefcase, testId: "bottom-nav-gigs" },
    { label: "Live Map", path: "/map", icon: MapPin, testId: "bottom-nav-map" },
    {
      label: "Profile",
      path: user ? "/profile" : null,
      icon: UserCircle2,
      testId: "bottom-nav-profile",
      action: user ? null : () => {
        setAuthMode("signin");
        setAuthOpen(true);
      },
    },
  ];

  return (
    <>
      <nav
        data-testid="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden items-center justify-around border-t-2 border-ink bg-white dark:bg-[#121212] px-1 py-1 shadow-[0px_-2px_10px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}
      >
        {tabs.map((t) => {
          const active = t.path ? loc.pathname === t.path : false;
          const Icon = t.icon;

          if (t.action) {
            return (
              <button
                key={t.label}
                data-testid={t.testId}
                onClick={t.action}
                className="flex flex-1 flex-col items-center justify-center py-1 text-center transition-transform active:scale-95"
              >
                <span className="flex h-6 w-6 items-center justify-center text-inkmuted dark:text-stone-400">
                  <Icon size={18} />
                </span>
                <span className="text-[10px] font-black tracking-tight text-inkmuted dark:text-stone-400 mt-0.5">
                  {t.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={t.label}
              to={t.path}
              data-testid={t.testId}
              className={`flex flex-1 flex-col items-center justify-center py-1 text-center transition-transform active:scale-95 ${
                active ? "text-brand" : "text-inkmuted dark:text-stone-400"
              }`}
            >
              <div className="relative flex h-6 w-6 items-center justify-center">
                <Icon size={18} className={active ? "text-brand" : "currentColor"} />
                {active && (
                  <span className="absolute -top-0.5 right-0 h-1.5 w-1.5 rounded-full bg-brand" />
                )}
              </div>
              <span
                className={`text-[10px] font-black tracking-tight mt-0.5 ${
                  active ? "text-brand" : "text-ink dark:text-stone-300"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <AuthModal isOpen={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </>
  );
}

// Sticky page header bar with optional back button + right slot
export function TopBar({ title, sub, right, onBack, backTestID = "topbar-back-btn" }) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-20 w-full border-b-2 border-ink bg-white dark:bg-[#121212]">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2.5 sm:gap-4 px-3 py-2.5 sm:px-8">
        {onBack !== false && (
          <button
            data-testid={backTestID}
            onClick={typeof onBack === "function" ? onBack : () => nav(-1)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center border-2 border-ink bg-white dark:bg-[#1f1f1f] text-ink dark:text-white transition hover:bg-sand active:translate-y-0.5"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm sm:text-base md:text-lg font-black tracking-tight text-ink dark:text-white">
            {title}
          </h1>
          {sub && (
            <p className="truncate text-[10px] sm:text-[11px] font-semibold text-inkmuted dark:text-stone-400">
              {sub}
            </p>
          )}
        </div>
        {right && <div className="shrink-0 flex items-center gap-1.5">{right}</div>}
      </div>
    </div>
  );
}

// Shell component (Full width responsive container with bottom nav)
export function Shell({ children, className = "" }) {
  return (
    <div className={`min-h-screen w-full bg-white dark:bg-[#0f0f10] text-ink dark:text-white ${className}`}>
      <GlobalNav />
      <main className="w-full pb-16 lg:pb-0">{children}</main>
      <MobileBottomNav />
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
    <div className="w-full border-b-2 border-ink bg-white dark:bg-[#121212]">
      <div className="wh-scroll mx-auto flex w-full max-w-[1600px] gap-3 overflow-x-auto px-4 py-3 sm:px-8">
        {cats.map((key) => {
          const v = CATEGORY_VISUALS[key] || CATEGORY_VISUALS.ALL;
          const on = selected === key;
          return (
            <button
              key={key}
              data-testid={`${testIDPrefix}-${key.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              onClick={() => onSelect(key)}
              className={`flex w-[100px] shrink-0 flex-col items-center gap-1.5 border-2 border-ink p-2.5 transition-transform active:translate-y-0.5 ${on ? "bg-ink dark:bg-[#2a2a2a]" : "bg-white dark:bg-[#1a1a1a] hover:bg-sand"}`}
            >
              <span
                className="flex h-10 w-10 items-center justify-center border-2 border-ink"
                style={{ background: on ? "#E65A1E" : v.bg }}
              >
                <CatIcon name={v.icon} size={20} className={on ? "text-white" : "text-[#121212] dark:text-[#121212]"} />
              </span>
              <span className={`text-center text-[10px] font-black leading-tight ${on ? "text-white dark:!text-white" : "text-ink dark:!text-white"}`}>
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
