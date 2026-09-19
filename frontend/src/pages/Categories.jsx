import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Shell, TopBar, Spinner, CatIcon } from "@/components/kit";
import { CATEGORY_VISUALS } from "@/lib/catalogFilters";
import { getStoredCatalog } from "@/lib/clientStore";
import { apiGet } from "@/lib/api";

export default function Categories() {
  const nav = useNavigate();
  const [catalog, setCatalog] = useState(() => getStoredCatalog());
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet("/catalog")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCatalog(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const goSearch = (term) => nav(`/freelancer/jobs?q=${encodeURIComponent(term)}`);
  const total = catalog.reduce((n, c) => n + c.subcategories.length, 0);

  return (
    <Shell>
      <TopBar title="ALL CATEGORIES" sub={`${catalog.length} categories · ${total} services`} backTestID="categories-back-btn" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-8 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.map((c) => {
              const expanded = open === c.category;
              const v = CATEGORY_VISUALS[c.category] || CATEGORY_VISUALS.ALL;
              return (
                <div key={c.category} className="border-2 border-ink bg-white dark:bg-[#181818] shadow-[2px_2px_0px_#121212]">
                  <button
                    data-testid={`cat-${c.category.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    onClick={() => setOpen(expanded ? null : c.category)}
                    className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-sand dark:hover:bg-[#222]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center border-2 border-ink" style={{ background: v.bg }}>
                      <CatIcon name={v.icon} size={20} className="!text-[#121212] !stroke-[#121212] text-black" />
                    </span>
                    <div className="flex-1">
                      <p className="text-base font-black text-ink dark:text-white">{c.category}</p>
                      <p className="text-xs text-inkmuted dark:text-stone-400">{c.subcategories.length} services</p>
                    </div>
                    {expanded ? <ChevronUp size={18} className="text-ink dark:text-white" /> : <ChevronDown size={18} className="text-ink dark:text-white" />}
                  </button>
                  {expanded && (
                    <div className="flex flex-wrap gap-2 border-t border-ink/20 p-3.5 bg-sand">
                      {c.subcategories.map((s) => (
                        <button
                          key={s}
                          data-testid={`sub-${s.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                          onClick={() => goSearch(s)}
                          className="flex items-center gap-1.5 border-[1.5px] border-ink bg-white px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-brand hover:text-white transition"
                        >
                          {s} <ArrowRight size={11} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-inkmuted">Tap any service to search matching gigs in Bengaluru</p>
        </div>
      )}
    </Shell>
  );
}
