import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight, Search, X, Sparkles, Tag, PlusCircle, HelpCircle } from "lucide-react";
import { Shell, TopBar, Spinner, CatIcon } from "@/components/kit";
import SuggestProfessionModal from "@/components/SuggestProfessionModal";
import { CATEGORY_VISUALS } from "@/lib/catalogFilters";
import { getStoredCatalog } from "@/lib/clientStore";
import { SUBDISCIPLINE_KEYWORDS, searchTaxonomy } from "@/lib/keywordTaxonomy";
import { apiGet } from "@/lib/api";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Categories() {
  usePageMeta({
    title: "Browse Freelance Categories & Skills Taxonomy · WorkHop",
    description: "Explore 11+ freelance categories, 150+ subdisciplines and 300+ local skill keywords across design, tech, video, marketing, and business in Bengaluru.",
    canonical: "https://workhop.in/categories",
    ogTitle: "Freelance Service Directory & Skills Taxonomy · WorkHop",
    ogDescription: "Find verified freelancers by category or search through Bangalore's comprehensive local skills taxonomy.",
  });

  const nav = useNavigate();
  const [catalog, setCatalog] = useState(() => getStoredCatalog());
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestProf, setSuggestProf] = useState("");

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

  const openSuggest = (initial = "") => {
    setSuggestProf(initial);
    setSuggestOpen(true);
  };

  return (
    <Shell>
      <TopBar title="ALL CATEGORIES & SERVICE TAXONOMY" sub={`${catalog.length} categories · ${total} services · 300+ search tags`} backTestID="categories-back-btn" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-8 pb-16">
          
          {/* Taxonomy Search Bar + Suggest Tab CTA */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="w-full max-w-xl">
              <div className="flex h-11 items-center gap-2 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-3 shadow-[2px_2px_0px_#121212]">
                <Search size={16} className="text-inkmuted" />
                <input
                  data-testid="categories-search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search taxonomy — e.g. Drone, AutoCAD, Framer, Voiceover, CapCut…"
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

              {search && search.trim().length >= 2 && matchedTaxonomy.length === 0 && (
                <div className="mt-2.5 flex items-center justify-between gap-2 border border-dashed border-ink/40 bg-sand/40 dark:bg-stone-900/60 p-2.5">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={15} className="text-brand shrink-0" />
                    <span className="text-xs text-ink dark:text-stone-300 font-medium">
                      Don't see <strong>"{search.trim()}"</strong> in our taxonomy?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSuggest(search.trim())}
                    className="border border-ink bg-brand px-2.5 py-1 text-xs font-black text-white hover:bg-brand/90 transition shadow-[1px_1px_0px_#121212] shrink-0"
                  >
                    + SUGGEST TAB
                  </button>
                </div>
              )}
            </div>

            {/* Quick Suggest Tab Button */}
            <button
              type="button"
              data-testid="categories-suggest-tab-btn"
              onClick={() => openSuggest("")}
              className="inline-flex items-center gap-2 border-2 border-ink bg-sand hover:bg-brand hover:text-white dark:bg-[#202020] dark:hover:bg-brand px-4 py-2.5 text-xs font-black uppercase tracking-wider text-ink dark:text-white transition shadow-[2px_2px_0px_#121212] self-start md:self-auto shrink-0"
            >
              <PlusCircle size={15} className="text-brand hover:text-white shrink-0" />
              <span>CAN'T FIND YOUR PROFESSION? SUGGEST TAB</span>
            </button>
          </div>

          {/* Featured Spotlight: AI & Smart Automations */}
          <div className="mb-6 border-2 border-ink bg-[#121212] p-4 sm:p-5 text-white shadow-[3px_3px_0px_#FF5A1F]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center border-2 border-white bg-brand text-white shadow-[2px_2px_0px_#ffffff]">
                  <Sparkles className="h-8 w-8 sm:h-9 sm:w-9 animate-pulse" strokeWidth={2.3} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#FFE082] text-ink px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      FEATURED CATEGORY
                    </span>
                    <span className="text-xs font-bold text-stone-400">HIGH DEMAND IN BENGALURU</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    AI &amp; Smart Automations
                  </h3>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { name: "AI Video & Reels", query: "AI UGC & Reel Generation" },
                  { name: "AI Graphic & 3D Render", query: "AI Product & Studio Photography" },
                  { name: "Automations & Bots", query: "No-Code Workflow Automation" },
                  { name: "AI Content & SEO", query: "AI Content Humanization & SEO Polishing" },
                  { name: "Coding with AI", query: "Custom Vibe Coding, Scripts & Web Fixes" },
                ].map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => goSearch(item.query)}
                    className="border border-white/80 bg-white/10 hover:bg-brand hover:border-brand px-2.5 py-1 text-xs font-black text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>{item.name}</span>
                    <ArrowRight size={11} className="text-brand shrink-0" />
                  </button>
                ))}
              </div>
            </div>
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
          {/* Bottom Suggest Profession Card */}
          <div className="mt-10 border-2 border-dashed border-ink/40 dark:border-stone-700 bg-sand/30 dark:bg-[#1a1a1a] p-5 sm:p-6 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center border-2 border-ink bg-brand text-white shadow-[2px_2px_0px_#121212] mb-3">
              <Sparkles size={18} />
            </div>
            <h4 className="text-base font-black text-ink dark:text-white uppercase">
              Don't See Your Profession or Niche Listed?
            </h4>
            <p className="mt-1 text-xs text-inkmuted dark:text-stone-300 max-w-md mx-auto">
              Help us expand WorkHop! Tell us what skills or profession tabs you'd like added for Bangalore. We review community requests weekly.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => openSuggest("")}
                className="inline-flex items-center gap-1.5 border-2 border-ink bg-brand px-5 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-brand/90 transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
              >
                <PlusCircle size={14} />
                <span>SUGGEST A NEW PROFESSION TAB</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-inkmuted">Tap any service or tag to search matching verified gigs &amp; pros in Bengaluru</p>
        </div>
      )}

      {/* Suggest Profession Modal */}
      <SuggestProfessionModal
        isOpen={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        initialProfession={suggestProf}
      />
    </Shell>
  );
}

