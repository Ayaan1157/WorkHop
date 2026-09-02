import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Loader2, Grid3x3, Palette, Code2, Megaphone,
  PenLine, Video, Sparkles, Music, Briefcase, Users,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { CATEGORY_VISUALS, CATEGORY_SHORT_LABELS } from "@/lib/catalogFilters";

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

export function IconBtn({ onClick, children, testID, className = "", active = false }) {
  return (
    <button
      data-testid={testID}
      onClick={onClick}
      className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink transition-transform active:translate-y-0.5 ${active ? "bg-brand" : "bg-white hover:bg-sand"} ${className}`}
    >
      {children}
    </button>
  );
}

// Sticky page header bar with optional back button + right slot
export function TopBar({ title, sub, onBack, right, backTestID = "back-btn" }) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b-2 border-ink bg-white px-4 py-3">
      {onBack !== false && (
        <IconBtn testID={backTestID} onClick={onBack || (() => nav(-1))}>
          <ChevronLeft size={22} className="text-ink" />
        </IconBtn>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-black tracking-[0.12em] text-ink">{title}</h1>
        {sub != null && <p className="truncate text-[11px] text-inkmuted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// Centered mobile-first canvas so web mirrors the phone layout but breathes on desktop
export function Shell({ children, max = "max-w-2xl" }) {
  return (
    <div className="min-h-screen bg-white">
      <div className={`mx-auto ${max} border-x-2 border-ink min-h-screen`}>{children}</div>
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
    <div className="wh-scroll flex gap-3 overflow-x-auto border-b-2 border-ink bg-white px-4 py-3">
      {cats.map((key) => {
        const v = CATEGORY_VISUALS[key] || CATEGORY_VISUALS.ALL;
        const on = selected === key;
        return (
          <button
            key={key}
            data-testid={`${testIDPrefix}-${key.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            onClick={() => onSelect(key)}
            className={`flex w-[86px] shrink-0 flex-col items-center gap-1.5 border-2 border-ink p-2 transition-transform active:translate-y-0.5 ${on ? "bg-ink" : "bg-white"}`}
          >
            <span
              className="flex h-9 w-9 items-center justify-center border-2 border-ink"
              style={{ background: on ? "#FF5A00" : v.bg }}
            >
              <CatIcon name={v.icon} size={18} className="text-ink" />
            </span>
            <span className={`text-center text-[9px] font-black leading-tight ${on ? "text-white" : "text-ink"}`}>
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
