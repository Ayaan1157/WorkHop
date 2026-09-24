import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight, Search, X, Sparkles, Tag } from "lucide-react";
import { Shell, TopBar, Spinner, CatIcon } from "@/components/kit";
import { CATEGORY_VISUALS } from "@/lib/catalogFilters";
import { getStoredCatalog } from "@/lib/clientStore";
import { SUBDISCIPLINE_KEYWORDS, searchTaxonomy } from "@/lib/keywordTaxonomy";
import { apiGet } from "@/lib/api";

export default function Categories() {
  const nav = useNavigate();
  const [catalog, setCatalog] = useState(() => getStoredCatalog());
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

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

  const matchedTaxonomy = useMemo(() => {
    if (!search || search.trim().length < 2) return [];
    return searchTaxonomy(search.trim());
  }, [search]);

  return (
    <Shell>
      <TopBar title="ALL CATEGORIES & SERVICE TAXONOMY" sub={`${catalog.length} categories · ${total} services · 300+ search tags`} backTestID="categories-back-btn" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-8 pb-16">
          
          {/* Taxonomy Search Bar */}
          <div className="mb-6 max-w-xl">
            <div className="flex h-11 items-center gap-2 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3 shadow-[2px_2px_0px_#121212]">
              <Search size={16} className="text-inkmuted" />
              <input
                data-testid="categories-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search taxonomy — e.g. AutoCAD, Framer, Zomato, Kannada VO, CapCut…"
                className="wh-input flex-1 bg-transparent text-sm font-bold text-ink dark:text-white placeholder:font-normal placeholder:text-inkmuted"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="flex h-[20px] w-[20px] items-center justify-center bg-ink"
                >
                  <X size={12} className="text-white" />
                </button>
              )}
            </div>

            {search && matchedTaxonomy.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400">Direct Matches:</span>
                {matchedTaxonomy.slice(0, 5).map((m) => (
                  <button
                    key={m.subdiscipline}
                    type="button"
                    onClick={() => goSearch(m.subdiscipline)}
                    className="inline-flex items-center gap-1 border border-ink bg-[#FFF3C4] dark:bg-stone-800 px-2 py-0.5 text-xs font-black text-ink dark:text-stone-200 hover:bg-brand hover:text-white transition shadow-[1px_1px_0px_#121212]"
                  >
                    <Sparkles size={11} className="text-brand shrink-0" />
                    <span>{m.subdiscipline}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.map((c) => {
              const expanded = open === c.category || Boolean(search && matchedTaxonomy.some((m) => m.category === c.category));
              const v = CATEGORY_VISUALS[c.category] || CATEGORY_VISUALS.ALL;
              return (
                <div key={c.category} className="border-2 border-ink bg-white dark:bg-[#181818] shadow-[2px_2px_0px_#121212]">
                  <button
                    data-testid={`cat-${c.category.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    onClick={() => setOpen(open === c.category ? null : c.category)}
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
                  <div className={`flex-col gap-2.5 border-t border-ink/20 p-3 bg-sand dark:bg-[#1a1a1a] ${expanded ? "flex" : "hidden"}`}>
                    {c.subcategories.map((s) => {
                      const tags = SUBDISCIPLINE_KEYWORDS[s] || [];
                      return (
                        <div key={s} className="border border-ink/30 bg-white dark:bg-[#222] p-2.5 shadow-[1.5px_1.5px_0px_#121212]">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              data-testid={`sub-${s.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                              onClick={() => goSearch(s)}
                              className="text-xs font-black text-ink dark:text-white hover:text-brand transition text-left flex items-center gap-1.5"
                            >
                              <span>{s}</span>
                              <ArrowRight size={11} className="text-brand shrink-0" />
                            </button>
                            <span className="text-[9px] font-bold text-inkmuted dark:text-stone-400 shrink-0 font-mono">
                              {tags.length} tags
                            </span>
                          </div>
                          {tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {tags.map((kw) => (
                                <button
                                  key={kw}
                                  type="button"
                                  onClick={() => goSearch(kw)}
                                  className="border border-ink/20 bg-sand/60 dark:bg-stone-800 px-1.5 py-0.5 text-[9px] font-bold text-ink dark:text-stone-300 hover:bg-brand hover:text-white transition"
                                >
                                  #{kw}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-inkmuted">Tap any service or tag to search matching verified gigs &amp; pros in Bengaluru</p>
        </div>
      )}
    </Shell>
  );
}
