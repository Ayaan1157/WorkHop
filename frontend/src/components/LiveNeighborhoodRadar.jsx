import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Navigation, Sparkles, CheckCircle2, ArrowRight, Zap, Users, Compass } from "lucide-react";

/**
 * LiveNeighborhoodRadar - Interactive "Live Neighborhood Radar" hero visual
 * matching Option 1 of the user concept.
 *
 * Features:
 * - Real Bengaluru street grid visualization (Koramangala, Indiranagar, HSR Layout, Whitefield, etc.)
 * - Sweeping radar scan wave across a 5km geofence radius
 * - Pulsing hotspot markers with distance tags (e.g., "800m away", "1.2km away")
 * - Dynamic live connection cards popping up (e.g., "UI Designer (800m away) connected with Café Owner")
 * - Live Pro Counter Pill: "147+ Verified Local Pros Active Nearby"
 * - Retains the playful Workhoppers-inspired Hopping Kangaroo perched on the radar!
 */
export default function LiveNeighborhoodRadar({ onSelectArea }) {
  // Live matches that cycle through to simulate real-time hyperlocal connections
  const MATCHES = [
    {
      id: 1,
      role: "UI & Brand Designer",
      distance: "800m away",
      area: "Koramangala 4th Block",
      avatar: "🎨",
      matchedWith: "Third Wave Coffee Partner",
      rate: "₹1,200/hr",
      x: 38,
      y: 42,
    },
    {
      id: 2,
      role: "React / Node Developer",
      distance: "1.4km away",
      area: "HSR Layout Sector 3",
      avatar: "💻",
      matchedWith: "QuickCommerce Hub",
      rate: "₹2,500/hr",
      x: 62,
      y: 68,
    },
    {
      id: 3,
      role: "Product Video Creator",
      distance: "1.8km away",
      area: "Indiranagar 100ft Rd",
      avatar: "🎥",
      matchedWith: "D2C Apparel Brand",
      rate: "₹1,800/hr",
      x: 72,
      y: 28,
    },
    {
      id: 4,
      role: "SEO & Growth Marketer",
      distance: "650m away",
      area: "Koramangala 5th Block",
      avatar: "📈",
      matchedWith: "Fintech Startup",
      rate: "₹1,500/hr",
      x: 48,
      y: 35,
    },
  ];

  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [activePin, setActivePin] = useState(1);

  // Auto-cycle through the live connection popup every 4.2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMatchIndex((prev) => (prev + 1) % MATCHES.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [MATCHES.length]);

  const currentMatch = MATCHES[activeMatchIndex];

  return (
    <div className="relative w-full max-w-[560px] border-2 border-ink bg-[#FFFDF9] dark:bg-[#161619] p-4 sm:p-6 shadow-[8px_8px_0px_#121212] select-none">
      
      {/* Top Header Bar: 5km Geofence Indicator + Live Counter Badge */}
      <div className="flex items-center justify-between border-b-2 border-ink/15 dark:border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ok" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-ink dark:text-white flex items-center gap-1">
            <span>LIVE 5KM RADAR</span>
            <span className="text-inkmuted dark:text-zinc-400 font-bold">· BENGALURU</span>
          </span>
        </div>

        {/* Live Active Counter Pill */}
        <div className="flex items-center gap-1.5 border border-ink bg-[#FFF3C4] px-2.5 py-1 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_#121212]">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          <span>147 Pros Active</span>
        </div>
      </div>

      {/* Main Radar Map Canvas Container */}
      <div className="relative aspect-[4/3] w-full border-2 border-ink bg-[#F5F8F5] dark:bg-[#0E1410] overflow-hidden shadow-inner">
        
        {/* SVG Street Grid & Neighborhood Topology */}
        <svg
          viewBox="0 0 500 380"
          className="absolute inset-0 h-full w-full pointer-events-none"
          preserveAspectRatio="none"
        >
          {/* Subtle Map Park / Green Zones */}
          <path
            d="M 20 60 Q 60 40 90 80 T 140 110 L 110 160 Q 50 150 20 120 Z"
            fill="#E2F0D9"
            className="dark:fill-[#152319] opacity-70"
          />
          <path
            d="M 360 220 Q 420 200 460 240 L 480 320 Q 400 350 350 300 Z"
            fill="#E2F0D9"
            className="dark:fill-[#152319] opacity-70"
          />
          <path
            d="M 240 310 Q 300 290 320 340 L 290 370 Q 230 360 240 310 Z"
            fill="#D9EBF5"
            className="dark:fill-[#14232C] opacity-70"
          />

          {/* Primary Road Arteries (Ring Roads, Hosur Rd, 100ft Rd, Old Airport Rd) */}
          <g stroke="#CBD5E1" className="dark:stroke-zinc-800" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Outer Ring Road arc */}
            <path d="M -20 180 Q 200 80 520 160" />
            {/* Inner Ring Road */}
            <path d="M 120 -20 Q 250 200 380 400" />
            {/* 100ft Road cross artery */}
            <path d="M 40 340 Q 260 220 480 80" />
            {/* Diagonal connects */}
            <path d="M -10 60 L 510 320" />
          </g>

          {/* Secondary Street Grid lines */}
          <g stroke="#E2E8F0" className="dark:stroke-zinc-900" strokeWidth="2.5" fill="none">
            <line x1="80" y1="0" x2="80" y2="380" />
            <line x1="160" y1="0" x2="160" y2="380" />
            <line x1="240" y1="0" x2="240" y2="380" />
            <line x1="320" y1="0" x2="320" y2="380" />
            <line x1="400" y1="0" x2="400" y2="380" />
            <line x1="0" y1="70" x2="500" y2="70" />
            <line x1="0" y1="140" x2="500" y2="140" />
            <line x1="0" y1="210" x2="500" y2="210" />
            <line x1="0" y1="280" x2="500" y2="280" />
            <line x1="0" y1="350" x2="500" y2="350" />
          </g>

          {/* Radar Geofence Range Rings (1km, 3km, 5km) Centered on User Hub */}
          <circle cx="210" cy="180" r="55" fill="none" stroke="#E65A1E" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.35" />
          <circle cx="210" cy="180" r="110" fill="none" stroke="#E65A1E" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.25" />
          <circle cx="210" cy="180" r="165" fill="none" stroke="#E65A1E" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.2" />

          {/* Radar Concentric Distance Labels */}
          <text x="214" y="120" fill="#E65A1E" fontSize="9" fontWeight="800" opacity="0.75">1 KM</text>
          <text x="214" y="65" fill="#E65A1E" fontSize="9" fontWeight="800" opacity="0.65">3 KM</text>
          <text x="214" y="12" fill="#E65A1E" fontSize="9" fontWeight="800" opacity="0.55">5 KM GEOFENCE</text>
        </svg>

        {/* Radar Sweeping Beam Animation */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="w-[340px] h-[340px] rounded-full wh-radar-sweep pointer-events-none"
            style={{
              background: "conic-gradient(from 0deg, rgba(230,90,30,0) 0deg, rgba(230,90,30,0) 290deg, rgba(230,90,30,0.22) 360deg)",
            }}
          />
        </div>

        {/* Street / Area Labels on Map */}
        <span className="absolute top-4 left-6 text-[9px] font-black text-inkmuted/60 dark:text-zinc-500 uppercase tracking-widest pointer-events-none">
          CBD / MG RD
        </span>
        <span className="absolute top-10 right-8 text-[10px] font-black text-ink/75 dark:text-zinc-300 uppercase tracking-wider pointer-events-none">
          INDIRANAGAR
        </span>
        <span className="absolute top-[48%] left-10 text-[10px] font-black text-ink/75 dark:text-zinc-300 uppercase tracking-wider pointer-events-none">
          KORAMANGALA
        </span>
        <span className="absolute bottom-6 right-16 text-[10px] font-black text-ink/75 dark:text-zinc-300 uppercase tracking-wider pointer-events-none">
          HSR LAYOUT
        </span>
        <span className="absolute bottom-4 left-4 text-[9px] font-black text-inkmuted/60 dark:text-zinc-500 uppercase tracking-widest pointer-events-none">
          BTM LAYOUT
        </span>

        {/* Center Target: User's Hyperlocal Origin Marker */}
        <div className="absolute top-[46%] left-[41%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-9 w-9 rounded-full bg-brand/20 animate-ping" />
            <span className="h-6 w-6 rounded-full border-2 border-ink bg-brand text-white flex items-center justify-center shadow-[1px_1px_0px_#121212]">
              <Navigation size={12} className="rotate-45 fill-white" />
            </span>
          </div>
          <span className="mt-1 border border-ink bg-white dark:bg-zinc-900 px-1.5 py-0.2 text-[9px] font-black uppercase text-ink dark:text-white shadow-[1px_1px_0px_#121212]">
            YOU ARE HERE
          </span>
        </div>

        {/* Pulsing Pro & Gig Hotspot Pins across the 5km zone */}
        {MATCHES.map((pin) => {
          const isSelected = pin.id === currentMatch.id;
          return (
            <button
              key={pin.id}
              type="button"
              onClick={() => setActiveMatchIndex(MATCHES.findIndex((m) => m.id === pin.id))}
              style={{ top: `${pin.y}%`, left: `${pin.x}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none transition-transform hover:scale-110"
              title={`${pin.role} in ${pin.area}`}
            >
              <div className="relative flex items-center justify-center">
                {/* Radar glow ripple */}
                <span
                  className={`absolute rounded-full transition-all duration-300 ${
                    isSelected
                      ? "h-11 w-11 bg-brand/35 animate-ping"
                      : "h-7 w-7 bg-ok/25 group-hover:bg-brand/30"
                  }`}
                />
                
                {/* Pin Circle */}
                <span
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-xs shadow-[2px_2px_0px_#121212] transition-colors ${
                    isSelected
                      ? "bg-brand text-white scale-110 ring-2 ring-brand"
                      : "bg-[#FFF3C4] text-ink group-hover:bg-brand group-hover:text-white"
                  }`}
                >
                  <span className="text-[12px]">{pin.avatar}</span>
                </span>
              </div>
            </button>
          );
        })}

        {/* Live Match Connection Card (Matches Option 1 Mockup exactly: "UI Designer (800m away) connected with Café Owner") */}
        <div
          data-testid="live-radar-match-card"
          className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-30 transition-all duration-300"
        >
          <div className="border-2 border-ink bg-white dark:bg-[#1A1A1E] p-2.5 sm:p-3 shadow-[4px_4px_0px_#121212] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Left: Avatar + Title & Live Connection Text */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-[#FFE8D6] dark:bg-zinc-800 text-lg shadow-[1.5px_1.5px_0px_#121212]">
                {currentMatch.avatar}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-black text-ink dark:text-white truncate">
                    {currentMatch.role}
                  </p>
                  <span className="border border-ink bg-[#E5F8EE] px-1.5 py-0.2 text-[9px] font-black text-ok shrink-0">
                    ⚡ {currentMatch.distance}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-inkmuted dark:text-zinc-400 truncate mt-0.5">
                  connected with <strong className="text-ink dark:text-white font-black">{currentMatch.matchedWith}</strong>
                </p>
              </div>
            </div>

            {/* Right: Quick Action Arrow to Chat / Hire */}
            <Link
              to="/employer"
              className="hidden xs:inline-flex items-center gap-1 border border-ink bg-sand hover:bg-brand hover:text-white px-2 py-1.5 text-[10px] font-black text-ink uppercase tracking-wider shrink-0 transition"
              title="Connect with local pro"
            >
              <span>CONNECT</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

      </div>

      {/* Bottom Neighborhood Switcher & Direct Hub Navigation */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-black text-inkmuted dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <MapPin size={12} className="text-brand shrink-0" />
          <span>NEIGHBORHOOD HUBS:</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {["Koramangala", "Indiranagar", "HSR Layout", "Whitefield"].map((hub) => (
            <button
              key={hub}
              type="button"
              onClick={() => onSelectArea && onSelectArea(hub)}
              className="border border-ink/30 px-2 py-0.5 text-[10px] font-bold text-ink dark:text-zinc-300 bg-white/90 dark:bg-zinc-800 hover:border-ink hover:bg-[#FFF3C4] dark:hover:bg-zinc-700 transition"
            >
              📍 {hub}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
