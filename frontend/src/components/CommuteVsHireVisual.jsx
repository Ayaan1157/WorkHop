import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, Phone, Sparkles, Building2, User, Zap } from "lucide-react";

/**
 * CommuteVsHireVisual
 * 
 * Replaces the hero visual on the home page with the split "Tired of the commute? / Tired of waiting to hire?" visual.
 * - Desktop/tablet: Shows the cohesive graphic with interactive hotspots overlaying the buttons and characters
 * - Mobile: Perfectly optimized responsive stacked or scaled view with large touch targets, direct buttons, and badges
 */
export default function CommuteVsHireVisual({ onChooseRole }) {
  const handleRole = (role) => {
    if (typeof onChooseRole === "function") {
      onChooseRole(role);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto select-none">
      {/* Main Container styled with WorkHop's neo-brutalist theme */}
      <div className="relative overflow-hidden border-2 sm:border-3 border-ink bg-[#FFF9F3] dark:bg-[#1a1917] shadow-[5px_5px_0px_#121212] sm:shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#E65A1E] rounded-xl sm:rounded-2xl transition-all">
        
        {/* Top Floating Badge Bar */}
        <div className="flex items-center justify-between border-b-2 border-ink bg-white/95 dark:bg-[#18181b] px-3 sm:px-4 py-2 sm:py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-ink dark:text-white">
              HYPERLOCAL NEIGHBORHOOD CONNECT
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-black text-[#E65A1E]">
            <Sparkles size={12} className="animate-spin text-brand" />
            <span>&lt; 5 KM GEOFENCE</span>
          </div>
        </div>

        {/* Visual Canvas with the Graphic */}
        <div className="relative w-full aspect-[1024/575] bg-[#FFF2DE] overflow-hidden group">
          <img
            src="/hero/commute-vs-hire.jpg"
            alt="Tired of the commute? Tired of waiting to hire? Connect directly with neighbors."
            className="w-full h-full object-cover object-center pointer-events-none"
            loading="eager"
            fetchPriority="high"
          />

          {/* Interactive Clickable Overlays matched to the 4 button zones in the artwork */}
          {/* Top Left [I'M A FREELANCER]: approx left: 9% to 24%, top: 22% to 31% */}
          <button
            type="button"
            data-testid="hero-visual-btn-freelancer-left"
            onClick={() => handleRole("freelancer")}
            aria-label="I'm a freelancer - Looking for gigs"
            className="absolute left-[9.2%] top-[22.2%] w-[14.2%] h-[8%] rounded-sm focus:outline-none focus:ring-2 focus:ring-[#E65A1E] transition hover:scale-105 active:scale-95 cursor-pointer bg-white/0 hover:bg-orange-500/20"
            title="I'm a Freelancer - Find gigs nearby"
          />

          {/* Top Left-Center [I'M A BUSINESS]: approx left: 30% to 42%, top: 22% to 31% */}
          <button
            type="button"
            data-testid="hero-visual-btn-business-left"
            onClick={() => handleRole("employer")}
            aria-label="I'm a business - Hire local pro"
            className="absolute left-[30.2%] top-[22.2%] w-[12.8%] h-[8%] rounded-sm focus:outline-none focus:ring-2 focus:ring-[#E65A1E] transition hover:scale-105 active:scale-95 cursor-pointer bg-white/0 hover:bg-orange-500/20"
            title="I'm a Business - Hire local talent"
          />

          {/* Top Right-Center [I'M A FREELANCER]: approx left: 57.5% to 71%, top: 22% to 31% */}
          <button
            type="button"
            data-testid="hero-visual-btn-freelancer-right"
            onClick={() => handleRole("freelancer")}
            aria-label="I'm a freelancer - Looking for gigs"
            className="absolute left-[57.2%] top-[22.2%] w-[13.8%] h-[8%] rounded-sm focus:outline-none focus:ring-2 focus:ring-[#E65A1E] transition hover:scale-105 active:scale-95 cursor-pointer bg-white/0 hover:bg-orange-500/20"
            title="I'm a Freelancer - Find gigs nearby"
          />

          {/* Top Right [I'M A BUSINESS]: approx left: 77.5% to 91%, top: 22% to 31% */}
          <button
            type="button"
            data-testid="hero-visual-btn-business-right"
            onClick={() => handleRole("employer")}
            aria-label="I'm a business - Hire local pro"
            className="absolute left-[77.2%] top-[22.2%] w-[14%] h-[8%] rounded-sm focus:outline-none focus:ring-2 focus:ring-[#E65A1E] transition hover:scale-105 active:scale-95 cursor-pointer bg-white/0 hover:bg-orange-500/20"
            title="I'm a Business - Hire local talent"
          />

          {/* Clickable zone for Freelancer Persona (Left half) */}
          <button
            type="button"
            data-testid="hero-visual-left-persona"
            onClick={() => handleRole("freelancer")}
            aria-label="Find local gigs as freelancer"
            className="absolute left-0 bottom-0 w-[49%] h-[68%] cursor-pointer focus:outline-none opacity-0 hover:opacity-10 transition-opacity bg-brand"
            title="Looking for Gigs nearby"
          />

          {/* Clickable zone for Business/Employer Persona (Right half) */}
          <button
            type="button"
            data-testid="hero-visual-right-persona"
            onClick={() => handleRole("employer")}
            aria-label="Hire local verified pro"
            className="absolute right-0 bottom-0 w-[49%] h-[68%] cursor-pointer focus:outline-none opacity-0 hover:opacity-10 transition-opacity bg-[#2A6F97]"
            title="Want to Hire Local Pro"
          />

          {/* Animated Pulse on the Wave connection line */}
          <div className="absolute left-[47%] top-[50%] -translate-y-1/2 pointer-events-none">
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border border-white" />
            </span>
          </div>
        </div>

        {/* Mobile & Tablet Interactive Action Panel (Optimized for small screens) */}
        <div className="border-t-2 border-ink bg-white dark:bg-[#18181b] p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Freelancer Side Action */}
            <button
              type="button"
              data-testid="action-cta-freelancer"
              onClick={() => handleRole("freelancer")}
              className="group relative flex flex-col items-center justify-center text-center p-2.5 sm:p-3 border-2 border-ink bg-[#FFF4EB] dark:bg-[#251710] shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none hover:border-brand cursor-pointer"
            >
              <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-black uppercase text-brand">
                <User size={13} className="shrink-0" />
                <span>I'M A FREELANCER</span>
              </div>
              <p className="mt-1 text-[11px] sm:text-xs font-black text-ink dark:text-white leading-tight">
                Looking for Gigs
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-inkmuted dark:text-zinc-400">
                <span>Find nearby work</span>
                <ArrowRight size={10} className="transition group-hover:translate-x-0.5 text-brand" />
              </span>
            </button>

            {/* Business Side Action */}
            <button
              type="button"
              data-testid="action-cta-business"
              onClick={() => handleRole("employer")}
              className="group relative flex flex-col items-center justify-center text-center p-2.5 sm:p-3 border-2 border-ink bg-[#E5F8EE] dark:bg-[#0f241a] shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none hover:border-ok cursor-pointer"
            >
              <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-black uppercase text-ok">
                <Building2 size={13} className="shrink-0" />
                <span>I'M A BUSINESS</span>
              </div>
              <p className="mt-1 text-[11px] sm:text-xs font-black text-ink dark:text-white leading-tight">
                Hire Local Pro
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-inkmuted dark:text-zinc-400">
                <span>Browse nearby pros</span>
                <ArrowRight size={10} className="transition group-hover:translate-x-0.5 text-ok" />
              </span>
            </button>
          </div>

          {/* Hyperlocal Benefit Strip */}
          <div className="mt-2.5 pt-2 border-t border-ink/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs font-bold text-inkmuted dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={13} className="text-emerald-500" />
              <span>Instant WhatsApp &amp; Call Unlock</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap size={13} className="text-brand" />
              <span>Zero Middlemen · 0% Fee</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
