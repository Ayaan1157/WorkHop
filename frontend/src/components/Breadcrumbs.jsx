import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs({ items = [], className = "" }) {
  return (
    <nav
      data-testid="breadcrumbs-nav"
      aria-label="Breadcrumbs"
      className={`flex flex-wrap items-center gap-1 text-[11px] font-bold text-inkmuted ${className}`}
    >
      <Link to="/" className="flex items-center gap-1 hover:text-ink transition">
        <Home size={12} />
        <span>Home</span>
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={12} className="text-ink/40" />
          {item.to ? (
            <Link to={item.to} className="hover:text-ink transition truncate max-w-[140px]">
              {item.label}
            </Link>
          ) : (
            <span className="font-extrabold text-ink truncate max-w-[180px]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
