import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="w-full border-t-2 border-ink bg-[#0B0B0C] text-white pt-12 sm:pt-16 pb-28 sm:pb-32 lg:pb-14 transition-colors">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-12">
        
        {/* Top Header: Brand Logo + Social Media Links */}
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4 pb-8 sm:pb-12 border-b border-white/15">
          {/* WorkHop Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center border-2 border-white bg-brand text-white font-black text-lg shadow-[2px_2px_0px_#ffffff] transition-transform group-hover:scale-105">
              W
            </span>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
                WORKHOP
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                Hyperlocal Talent Network
              </span>
            </div>
          </Link>

          {/* Social Icons (Minimalist monochrome like reference image) */}
          <div className="flex items-center gap-3">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 hover:border-white hover:text-white hover:bg-white/10 transition"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 hover:border-white hover:text-white hover:bg-white/10 transition"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/work.hop?stkn=ZHNobjNnZGx1ODg3"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram (@work.hop)"
              title="Follow @work.hop on Instagram"
              className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:border-white hover:text-white hover:bg-white/10 transition"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="font-bold">@work.hop</span>
            </a>

            {/* X / Twitter */}
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 hover:border-white hover:text-white hover:bg-white/10 transition"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Main Grid: 2 columns on mobile, 3 columns on tablet & desktop */}
        <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-8 sm:gap-y-10 sm:grid-cols-3 pt-8 sm:pt-12">
          
          {/* Column 1: For Employers (Business) */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-white">
              Business
            </h4>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm text-stone-400">
              <li>
                <Link to="/employer" className="hover:text-white transition">
                  Explore Verified Pros
                </Link>
              </li>
              <li>
                <Link to="/employer/post-job" className="hover:text-white transition">
                  Post a Local Gig
                </Link>
              </li>
              <li>
                <Link to="/employer/plans" className="hover:text-white transition">
                  Pricing &amp; Unlock Plans
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-white transition">
                  Live Radar Talent Map
                </Link>
              </li>
              <li>
                <Link to="/employer/inbox" className="hover:text-white transition">
                  Applicant Inbox
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-white transition">
                  Hire by Category
                </Link>
              </li>
              <li>
                <Link to="/legal" className="hover:text-white transition">
                  Escrow &amp; Dispute Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: For Freelancers (Benefits) */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-white">
              Benefits
            </h4>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm text-stone-400">
              <li>
                <Link to="/freelancer/jobs" className="hover:text-white transition">
                  Find Gigs (Within 5km)
                </Link>
              </li>
              <li>
                <Link to="/freelancer" className="hover:text-white transition">
                  Freelancer Verification
                </Link>
              </li>
              <li>
                <Link to="/freelancer/chats" className="hover:text-white transition">
                  Direct WhatsApp &amp; Chat
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-white transition">
                  Gig Radar Map
                </Link>
              </li>
              <li>
                <Link to="/freelancer/profile" className="hover:text-white transition">
                  Portfolio Showcase
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Compliance (Trust & Legal) */}
          <div className="flex flex-col gap-3 col-span-2 sm:col-span-1">
            <h4 className="text-sm font-black uppercase tracking-wider text-white">
              Trust &amp; Legal
            </h4>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm text-stone-400">
              <li>
                <Link to="/legal" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/legal" className="hover:text-white transition">
                  Privacy Policy (DPDP Act 2023)
                </Link>
              </li>
              <li>
                <Link to="/legal" className="hover:text-white transition">
                  Payments &amp; Escrow Rules
                </Link>
              </li>
              <li>
                <Link to="/legal" className="hover:text-white transition">
                  Community &amp; Safety Guidelines
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-white transition">
                  Help Desk &amp; Grievance Redressal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip: Copyright & Statutory Badges */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-400 font-medium text-center sm:text-left">
          <p>© 2026 WorkHop Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-stone-400">
            <span>⚡ IT Act, 2000 &amp; DPDP Act, 2023 Compliant</span>
            <span className="hidden xs:inline">·</span>
            <span>Bengaluru, Karnataka, India</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
