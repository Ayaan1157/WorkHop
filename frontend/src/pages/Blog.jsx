import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  BookOpen, Search, ArrowRight, ArrowLeft, Clock, Calendar,
  User, Tag, CheckCircle2, Share2, Sparkles, PlusCircle,
  Briefcase, MessageCircle, MapPin, ChevronRight, Check
} from "lucide-react";
import { Shell, TopBar, EmptyBlock } from "@/components/kit";
import { BLOG_POSTS, getBlogPostBySlug, getRelatedBlogPosts } from "@/data/blogPosts";

export default function Blog() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [copied, setCopied] = useState(false);

  // If a slug is provided, we show the single article view
  const currentPost = useMemo(() => {
    if (!slug) return null;
    return getBlogPostBySlug(slug);
  }, [slug]);

  const categories = useMemo(() => {
    const set = new Set(BLOG_POSTS.map((p) => p.category));
    return ["ALL", ...Array.from(set)];
  }, []);

  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      const matchCat = selectedCategory === "ALL" || post.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        post.keywords.some((k) => k.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  const featuredPost = BLOG_POSTS[0];

  // Dynamic document title for SEO
  useEffect(() => {
    if (currentPost) {
      document.title = `${currentPost.title} | WorkHop Blog`;
    } else {
      document.title = "WorkHop Blog: Bengaluru's Hyperlocal Gig & Hiring Guides (SEO)";
    }
  }, [currentPost]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentPost?.title || "WorkHop Blog",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // VIEW 1: SINGLE ARTICLE DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════
  if (slug) {
    if (!currentPost) {
      return (
        <Shell>
          <TopBar title="ARTICLE NOT FOUND" sub="WorkHop Blog &amp; Insights" />
          <div className="mx-auto max-w-2xl px-4 py-20 text-center">
            <h1 className="text-2xl font-black text-ink mb-2">Article Not Found</h1>
            <p className="text-sm text-inkmuted mb-6">
              The article you are looking for may have been moved or updated.
            </p>
            <button
              onClick={() => nav("/blog")}
              className="border-2 border-ink bg-brand px-6 py-3 text-xs font-black text-white shadow-[2px_2px_0px_#121212]"
            >
              ← BACK TO ALL ARTICLES
            </button>
          </div>
        </Shell>
      );
    }

    const relatedPosts = getRelatedBlogPosts(currentPost.slug, 3);

    return (
      <Shell>
        {/* SEO Structured Data for Google */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": currentPost.title,
            "description": currentPost.metaDescription,
            "author": {
              "@type": "Person",
              "name": currentPost.author.name,
              "jobTitle": currentPost.author.role
            },
            "publisher": {
              "@type": "Organization",
              "name": "WorkHop",
              "logo": {
                "@type": "ImageObject",
                "url": "https://workhop.in/logo.png"
              }
            },
            "datePublished": currentPost.publishedAt,
            "keywords": currentPost.keywords.join(", ")
          })}
        </script>

        <TopBar
          title="WORKHOP BLOG"
          sub={currentPost.category}
          backTestID="blog-back-btn"
          right={
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 border-2 border-ink bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-black text-ink dark:text-white shadow-[1.5px_1.5px_0px_#121212] active:translate-y-0.5"
            >
              <Share2 size={13} />
              <span>{copied ? "COPIED LINK!" : "SHARE"}</span>
            </button>
          }
        />

        <article className="mx-auto w-full max-w-4xl px-4 sm:px-8 py-8 sm:py-12">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs font-bold text-inkmuted">
            <Link to="/" className="hover:text-brand transition">Home</Link>
            <ChevronRight size={13} />
            <Link to="/blog" className="hover:text-brand transition">Blog</Link>
            <ChevronRight size={13} />
            <span className="text-ink dark:text-white truncate max-w-[260px] sm:max-w-md">{currentPost.category}</span>
          </nav>

          {/* Category Badge & Meta */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border border-ink ${currentPost.categoryColor}`}>
              {currentPost.category}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-inkmuted">
              <Clock size={12} /> {currentPost.readTime}
            </span>
            <span className="text-inkmuted">·</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-inkmuted">
              <Calendar size={12} /> {currentPost.publishedAt}
            </span>
          </div>

          {/* Main Title (Single H1 for SEO) */}
          <h1 className="text-2xl sm:text-4xl font-black text-ink dark:text-white tracking-tight leading-tight mb-4">
            {currentPost.title}
          </h1>

          {/* Subtitle / Excerpt */}
          <p className="text-base sm:text-lg text-inkmuted dark:text-stone-300 font-semibold leading-relaxed mb-6 border-l-4 border-brand pl-4 py-1">
            {currentPost.summary}
          </p>

          {/* Author info strip */}
          <div className="flex items-center justify-between border-y-2 border-ink py-4 mb-8">
            <div className="flex items-center gap-3">
              <img
                src={currentPost.author.avatar}
                alt={currentPost.author.name}
                className="h-11 w-11 rounded-full border-2 border-ink object-cover"
              />
              <div>
                <p className="text-sm font-black text-ink dark:text-white">{currentPost.author.name}</p>
                <p className="text-xs text-inkmuted font-semibold">{currentPost.author.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 border border-ink bg-sand px-3 py-1.5 text-xs font-black text-ink hover:bg-sand/80 shadow-[1px_1px_0px_#121212]"
              >
                <Share2 size={13} />
                <span>{copied ? "Link Copied!" : "Share Article"}</span>
              </button>
            </div>
          </div>

          {/* Cover Hero Image */}
          <div className="border-2 border-ink mb-10 overflow-hidden shadow-[4px_4px_0px_#121212]">
            <img
              src={currentPost.coverImage}
              alt={currentPost.title}
              className="w-full h-64 sm:h-96 object-cover"
            />
          </div>

          {/* Article Body */}
          <div className="prose prose-stone dark:prose-invert max-w-none space-y-6 text-ink dark:text-stone-200">
            {currentPost.content.map((block, i) => {
              if (block.type === "paragraph") {
                return (
                  <p key={i} className="text-base sm:text-lg leading-relaxed font-medium">
                    {block.text}
                  </p>
                );
              }
              if (block.type === "heading2") {
                return (
                  <h2 key={i} className="text-xl sm:text-2xl font-black text-ink dark:text-white tracking-tight mt-8 mb-3">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "quote") {
                return (
                  <blockquote
                    key={i}
                    className="border-l-4 border-ink bg-[#FFF3C4] dark:bg-[#25221b] p-5 my-6 shadow-[2px_2px_0px_#121212] italic text-base sm:text-lg font-bold text-ink dark:text-stone-100"
                  >
                    "{block.text}"
                  </blockquote>
                );
              }
              if (block.type === "list") {
                return (
                  <ul key={i} className="space-y-3 my-4">
                    {block.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-base sm:text-lg font-medium leading-relaxed">
                        <Check size={18} className="text-ok shrink-0 mt-1" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return null;
            })}
          </div>

          {/* Keyword Taxonomy Tags */}
          <div className="mt-12 pt-6 border-t-2 border-ink">
            <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted mb-2">
              SEO KEYWORDS &amp; TOPICS
            </p>
            <div className="flex flex-wrap gap-2">
              {currentPost.keywords.map((kw) => (
                <span
                  key={kw}
                  className="border border-ink/40 bg-sand/60 dark:bg-stone-800 px-2.5 py-1 text-xs font-bold text-ink dark:text-stone-300"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>

          {/* IN-ARTICLE CTA BOX */}
          <div className="my-12 border-2 border-ink bg-[#E5F8EE] p-6 sm:p-8 shadow-[4px_4px_0px_#121212]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <span className="border border-ink bg-ok text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                  START HIRING NEARBY
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-ink mt-1">
                  Ready to post a freelance gig in Bengaluru?
                </h3>
                <p className="text-xs sm:text-sm text-inkmuted font-semibold mt-1 max-w-lg">
                  Job posting is 100% free with zero platform fees. Connect directly with verified talent in your 5km radius via WhatsApp.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => nav("/employer/post-job")}
                  className="flex items-center justify-center gap-1.5 border-2 border-ink bg-brand px-5 py-3 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212] hover:bg-brand/90 transition"
                >
                  <PlusCircle size={14} /> POST A GIG (FREE)
                </button>
                <button
                  onClick={() => nav("/employer")}
                  className="flex items-center justify-center gap-1.5 border-2 border-ink bg-white px-5 py-3 text-xs font-black uppercase text-ink shadow-[2px_2px_0px_#121212] hover:bg-stone-50 transition"
                >
                  EXPLORE PROS <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* RELATED ARTICLES */}
          {relatedPosts.length > 0 && (
            <div className="mt-12 border-t-2 border-ink pt-8">
              <h3 className="text-lg font-black uppercase tracking-tight text-ink dark:text-white mb-6">
                Related Guides &amp; Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.id}
                    to={`/blog/${rp.slug}`}
                    className="flex flex-col justify-between border-2 border-ink bg-white dark:bg-[#161618] p-4 shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:border-brand"
                  >
                    <div>
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase border border-ink ${rp.categoryColor} mb-2`}>
                        {rp.category}
                      </span>
                      <h4 className="text-sm font-black text-ink dark:text-white leading-snug line-clamp-2">
                        {rp.title}
                      </h4>
                      <p className="text-xs text-inkmuted dark:text-stone-400 mt-2 line-clamp-2 font-medium">
                        {rp.summary}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-ink/15 flex items-center justify-between text-[11px] font-black text-brand">
                      <span>READ GUIDE</span>
                      <ArrowRight size={13} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog */}
          <div className="mt-10 text-center">
            <button
              onClick={() => nav("/blog")}
              className="inline-flex items-center gap-1.5 border-2 border-ink bg-sand px-6 py-3 text-xs font-black uppercase text-ink hover:bg-sand/80 shadow-[2px_2px_0px_#121212]"
            >
              <ArrowLeft size={14} /> BACK TO ALL ARTICLES &amp; GUIDES
            </button>
          </div>
        </article>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW 2: BLOG DIRECTORY / INDEX LIST VIEW (/blog)
  // ══════════════════════════════════════════════════════════════════
  return (
    <Shell>
      {/* Schema.org Blog indexing */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "WorkHop Blog & Guides",
          "description": "Guides, market insights, and rate cards for Bengaluru's hyperlocal freelancing network.",
          "url": "https://workhop.in/blog"
        })}
      </script>

      <TopBar
        title="WORKHOP BLOG &amp; GUIDES"
        sub="Hyperlocal Hiring Insights, Freelance Rate Cards &amp; Bengaluru Playbooks"
        backTestID="blog-index-back-btn"
        right={
          <button
            onClick={() => nav("/employer/post-job")}
            className="flex items-center gap-1.5 border-2 border-ink bg-brand px-3 py-1.5 text-xs font-black text-white shadow-[1.5px_1.5px_0px_#121212]"
          >
            <PlusCircle size={13} />
            <span>POST GIG (FREE)</span>
          </button>
        }
      />

      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-8 pb-20">
        {/* HERO BANNER FOR BLOG */}
        <div className="mb-8 border-2 border-ink bg-sand dark:bg-[#1a1a1e] p-6 sm:p-10 shadow-[4px_4px_0px_#121212]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="border border-ink bg-brand text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                BENGALURU GIG ECONOMY INSIGHTS
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-ink dark:text-white tracking-tight mt-2">
                WorkHop Blog &amp; Guides
              </h1>
              <p className="text-sm sm:text-base text-inkmuted dark:text-stone-300 font-semibold mt-2 leading-relaxed">
                Practical playbooks on hyperlocal 5km hiring, verified freelance rate benchmarks, direct WhatsApp recruiting, and how to scale your startup with neighborhood talent.
              </p>
            </div>

            {/* Quick search input */}
            <div className="w-full lg:w-96">
              <div className="flex h-12 items-center gap-2 border-2 border-ink bg-white dark:bg-[#121212] px-3 shadow-[2px_2px_0px_#121212]">
                <Search size={18} className="text-inkmuted shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search guides (e.g. rate card, free post, CAD)…"
                  className="wh-input flex-1 bg-transparent text-sm font-semibold text-ink dark:text-white placeholder:text-inkmuted outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b-2 border-ink">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wide whitespace-nowrap border-2 border-ink transition shadow-[1.5px_1.5px_0px_#121212] active:translate-y-0.5 ${
                selectedCategory === cat
                  ? "bg-brand text-white"
                  : "bg-white dark:bg-stone-800 text-ink dark:text-white hover:bg-sand"
              }`}
            >
              {cat === "ALL" ? `ALL ARTICLES (${BLOG_POSTS.length})` : cat}
            </button>
          ))}
        </div>

        {/* FEATURED ARTICLE HERO (Only shown if no search filter is active) */}
        {!search && selectedCategory === "ALL" && (
          <div className="mb-12 border-2 border-ink bg-white dark:bg-[#161618] shadow-[5px_5px_0px_#121212] overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div className="lg:col-span-7 h-64 sm:h-96 border-b-2 lg:border-b-0 lg:border-r-2 border-ink overflow-hidden">
                <img
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover transition hover:scale-105 duration-500"
                />
              </div>
              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="border border-ink bg-ok text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      FEATURED ARTICLE
                    </span>
                    <span className="text-xs font-bold text-inkmuted">
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-ink dark:text-white leading-tight mb-3">
                    <Link to={`/blog/${featuredPost.slug}`} className="hover:text-brand transition">
                      {featuredPost.title}
                    </Link>
                  </h2>
                  <p className="text-xs sm:text-sm text-inkmuted dark:text-stone-300 font-medium leading-relaxed mb-4">
                    {featuredPost.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-ink/15 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={featuredPost.author.avatar}
                      alt={featuredPost.author.name}
                      className="h-8 w-8 rounded-full border border-ink object-cover"
                    />
                    <span className="text-xs font-bold text-ink dark:text-white">{featuredPost.author.name}</span>
                  </div>
                  <Link
                    to={`/blog/${featuredPost.slug}`}
                    className="flex items-center gap-1.5 border-2 border-ink bg-brand px-4 py-2 text-xs font-black text-white hover:bg-brand/90 transition shadow-[1.5px_1.5px_0px_#121212]"
                  >
                    READ ARTICLE <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ARTICLES GRID */}
        {filteredPosts.length === 0 ? (
          <EmptyBlock
            title="No matching articles found"
            sub="Try searching for another keyword or switch category filters."
            action={
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("ALL");
                }}
                className="mt-2 border-2 border-ink bg-brand px-5 py-2.5 text-xs font-black text-white"
              >
                CLEAR FILTERS
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="flex flex-col justify-between border-2 border-ink bg-white dark:bg-[#161618] shadow-[3px_3px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:border-brand"
              >
                <div>
                  <div className="h-48 border-b-2 border-ink overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition hover:scale-105 duration-300"
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${post.categoryColor}`}>
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-inkmuted">
                        <Clock size={11} /> {post.readTime}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-ink dark:text-white leading-snug">
                      <Link to={`/blog/${post.slug}`} className="hover:text-brand transition">
                        {post.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-inkmuted dark:text-stone-300 font-medium mt-2.5 leading-relaxed line-clamp-3">
                      {post.summary}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-ink/15 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={post.author.avatar}
                        alt={post.author.name}
                        className="h-6 w-6 rounded-full border border-ink object-cover"
                      />
                      <span className="text-[11px] font-bold text-inkmuted">{post.author.name}</span>
                    </div>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="flex items-center gap-1 text-xs font-black text-brand hover:underline"
                    >
                      READ GUIDE <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* BOTTOM SEO EXPLORATION BANNER */}
        <div className="mt-16 border-2 border-ink bg-[#FFF3C4] p-6 sm:p-8 shadow-[4px_4px_0px_#121212]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand">
                BANGALORE'S GIG NETWORK
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-ink mt-0.5">
                Explore Talent Across Koramangala, Indiranagar, HSR &amp; Whitefield
              </h3>
              <p className="text-xs sm:text-sm text-inkmuted font-semibold mt-1 max-w-2xl">
                Looking for specific skills? Browse our full taxonomy of Graphic Designers, Framer Developers, AutoCAD Draftsmen, Video Editors, and Voiceover artists near you.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => nav("/categories")}
                className="flex items-center gap-1.5 border-2 border-ink bg-ink px-5 py-3 text-xs font-black text-white hover:bg-black transition shadow-[2px_2px_0px_#121212]"
              >
                BROWSE CATEGORIES
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
