import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Shell, TopBar, Spinner, CatIcon } from "@/components/kit";
import { CATEGORY_VISUALS } from "@/lib/catalogFilters";
import { apiGet } from "@/lib/api";

export default function Categories() {
  const nav = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/catalog").then(setCatalog).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const goSearch = (term) => nav(`/freelancer/jobs?q=${encodeURIComponent(term)}`);
  const total = catalog.reduce((n, c) => n + c.subcategories.length, 0);

  return (
    <Shell>
      <TopBar title="ALL CATEGORIES" sub={`${catalog.length} categories · ${total} services`} backTestID="categories-back-btn" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-3 p-4 pb-16">
          {catalog.map((c) => {
            const expanded = open === c.category;
            const v = CATEGORY_VISUALS[c.category] || CATEGORY_VISUALS.ALL;
            return (
              <div key={c.category} className="border-2 border-ink bg-white">
                <button
                  data-testid={`cat-${c.category.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  onClick={() => setOpen(expanded ? null : c.category)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="flex h-10 w-10 items-center justify-center border-2 border-ink" style={{ background: v.bg }}>
                    <CatIcon name={v.icon} size={18} className="text-ink" />
                  </span>
                  <div className="flex-1">
                    <p className="text-[15px] font-black text-ink">{c.category}</p>
                    <p className="text-[11px] text-inkmuted">{c.subcategories.length} services</p>
                  </div>
                  {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expanded && (
                  <div className="flex flex-wrap gap-2 p-3 pt-0">
                    {c.subcategories.map((s) => (
                      <button
                        key={s}
                        data-testid={`sub-${s.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                        onClick={() => goSearch(s)}
                        className="flex items-center gap-1.5 border-[1.5px] border-ink bg-sand px-2 py-1.5 text-xs font-bold text-ink hover:bg-brand hover:text-white"
                      >
                        {s} <ArrowRight size={11} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <p className="mt-1 text-center text-[11px] text-inkmuted">Tap any service to search matching gigs in Bengaluru</p>
        </div>
      )}
    </Shell>
  );
}
