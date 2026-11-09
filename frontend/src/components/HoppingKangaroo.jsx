import React, { useState } from "react";

/**
 * HoppingKangaroo - Playful interactive hopper component inspired by Workhoppers.
 * Can hop across the rooftop / skyline with trajectory arc and bounce,
 * with tooltip "Hop to nearby gigs!".
 */
export default function HoppingKangaroo({ className = "" }) {
  const [hopping, setHopping] = useState(false);
  const [hopCount, setHopCount] = useState(0);

  const triggerHop = () => {
    if (hopping) return;
    setHopping(true);
    setHopCount((prev) => prev + 1);
    setTimeout(() => {
      setHopping(false);
    }, 1800);
  };

  return (
    <div
      className={`relative inline-flex items-end select-none ${className}`}
      onClick={triggerHop}
      role="button"
      tabIndex={0}
      title="Click me to hop!"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerHop();
        }
      }}
    >
      {/* Playful Speech Bubble / Badge */}
      <div
        className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap border border-ink bg-[#FFF3C4] px-1.5 py-0.5 text-[9px] font-black uppercase text-ink shadow-[1px_1px_0px_#121212] transition-all duration-300 pointer-events-none ${
          hopping ? "scale-110 -translate-y-2 text-brand" : "scale-100"
        }`}
      >
        <span>{hopping ? "HOPPING! ⚡" : "LET'S HOP! 🦘"}</span>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rotate-45 border-r border-b border-ink bg-[#FFF3C4]" />
      </div>

      {/* Hopper Animated Wrapper */}
      <div
        className={`relative cursor-pointer transition-transform duration-200 hover:scale-105 ${
          hopping ? "wh-kangaroo-hopping" : "wh-kangaroo-idle"
        }`}
      >
        {/* Hop trajectory dotted trail (visible when hopping or idle subtle) */}
        <svg
          className="absolute -top-6 -left-8 w-24 h-12 pointer-events-none overflow-visible opacity-70"
          viewBox="0 0 96 48"
          fill="none"
        >
          <path
            d="M 4 44 Q 48 -4 92 44"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeDasharray="3 3"
            className="text-brand/60"
          />
        </svg>

        {/* Kangaroo / Hopper SVG Mascot */}
        <svg
          viewBox="0 0 64 64"
          className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-[2px_3px_0px_rgba(18,18,18,0.25)] transition-colors"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Kangaroo Body Silhouette (Neo-brutalist Brand Style) */}
          {/* Main Body */}
          <path
            d="M24 44 C22 36 24 26 31 18 C33 15 36 12 40 10 C42 9 44 8 46 6 C47 5 48 5 49 6 C50 7 49 9 48 11 C47 13 46 15 48 16 C50 17 53 18 55 20 C57 22 56 25 54 26 C51 27 48 26 46 26 C44 28 42 32 43 36 C44 40 46 43 50 46 C52 47 54 49 55 52 C55 54 53 56 50 56 C46 56 42 53 38 50 C34 48 30 48 26 50 C22 52 18 53 14 53 C10 53 6 51 3 48 C2 47 2 45 4 44 C8 44 14 45 19 46 C21 46 23 45 24 44 Z"
            fill="#E65A1E"
            stroke="#121212"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Ears */}
          <path
            d="M44 8 C44 5 46 2 48 1 C49 2 49 5 48 8 Z"
            fill="#E65A1E"
            stroke="#121212"
            strokeWidth="1.75"
          />
          <path
            d="M41 10 C41 6 43 3 45 2 C46 3 45 6 44 9 Z"
            fill="#FF8042"
            stroke="#121212"
            strokeWidth="1.5"
          />

          {/* Eye */}
          <circle cx="49" cy="19" r="1.75" fill="#121212" />
          <circle cx="49.5" cy="18.5" r="0.6" fill="#FFFFFF" />

          {/* Snout / Smile */}
          <path
            d="M54 22 C53 23 51 23 50 23"
            stroke="#121212"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Front Paws / Arms */}
          <path
            d="M43 27 C46 28 48 30 47 32 C46 33 44 33 42 31 C40 30 40 28 43 27 Z"
            fill="#FF8042"
            stroke="#121212"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />

          {/* Pouch */}
          <path
            d="M34 32 C38 32 40 36 39 40 C35 41 32 38 34 32 Z"
            fill="#FFF3C4"
            stroke="#121212"
            strokeWidth="1.5"
          />

          {/* Powerful Hind Leg */}
          <path
            d="M27 38 C31 38 36 43 36 48 C36 53 32 56 27 57 C22 57 19 55 19 51 C19 45 23 38 27 38 Z"
            fill="#D94E14"
            stroke="#121212"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Big Foot */}
          <path
            d="M22 55 L35 56 C37 56 38 57 37 58 C35 59 28 60 20 59 C18 59 17 57 19 56 L22 55 Z"
            fill="#121212"
            stroke="#121212"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Tail Arc */}
          <path
            d="M19 46 C15 45 10 44 6 45 C4 45.5 3 47 4 48 C7 50 11 52 16 52"
            stroke="#121212"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Small ground dust puff when bouncing */}
        <div
          className={`absolute -bottom-1 left-3 flex items-center gap-1 transition-opacity duration-200 ${
            hopping ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sand-dark dark:bg-zinc-500 border border-ink" />
          <span className="h-1 w-1 rounded-full bg-sand-dark dark:bg-zinc-400 border border-ink" />
        </div>
      </div>
    </div>
  );
}
