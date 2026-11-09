import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { LocateFixed, PhoneCall, Lock, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";

/**
 * PinnedHowItWorks - Scroll-driven 3D pinned showcase for WorkHop
 *
 * Pattern inspired by Reference (dark canvas, 3D device tilt that flattens on scroll,
 * pinned viewport progress, interactive step progression, exact WorkHop copy & artwork).
 */
export default function PinnedHowItWorks() {
  const containerRef = useRef(null);

  // Track scroll through the pinned container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // 1. Entry 3D Device Tilt -> Flatten over the first 0% - 20% of scroll
  // Tilted: rotateX ~ 20deg, rotateY ~ -4deg, scale ~ 0.93
  // Flattens: rotateX 0deg, rotateY 0deg, scale 1.0
  const rotateX = useTransform(scrollYProgress, [0, 0.20], [20, 0]);
  const rotateY = useTransform(scrollYProgress, [0, 0.20], [-4, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.20, 0.95, 1], [0.93, 1, 1, 0.98]);
  const frameOpacity = useTransform(scrollYProgress, [0, 0.05, 0.98, 1], [0.9, 1, 1, 0.95]);
  const scrollBarHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // Active step index (0, 1, 2) derived from scroll progress
  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // 0.00 - 0.40: Step 1 (Post or find a job)
    // 0.40 - 0.72: Step 2 (Chat & agree)
    // 0.72 - 1.00: Step 3 (Get paid securely)
    if (latest < 0.40) {
      setActiveStep(0);
    } else if (latest < 0.72) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  });

  // Step Opacity & Transitions for Content Inside Frame
  // Step 1: active 0 to 0.40, cross-fade out 0.36 - 0.42
  const step1Opacity = useTransform(scrollYProgress, [0, 0.36, 0.42], [1, 1, 0]);
  const step1Scale = useTransform(scrollYProgress, [0, 0.36, 0.42], [1, 1, 0.96]);

  // Step 2: cross-fade in 0.38 - 0.44, active until 0.70, cross-fade out 0.68 - 0.74
  const step2Opacity = useTransform(scrollYProgress, [0.38, 0.44, 0.68, 0.73], [0, 1, 1, 0]);
  const step2Scale = useTransform(scrollYProgress, [0.38, 0.44, 0.68, 0.73], [0.96, 1, 1, 0.96]);

  // Step 3: cross-fade in 0.69 - 0.75, active until end of section
  const step3Opacity = useTransform(scrollYProgress, [0.69, 0.75, 1], [0, 1, 1]);
  const step3Scale = useTransform(scrollYProgress, [0.69, 0.75, 1], [0.96, 1, 1]);

  // Step 1 Internal micro-animations
  const step1CircleScale = useTransform(scrollYProgress, [0.10, 0.32], [0.7, 1.05]);
  const step1CircleOpacity = useTransform(scrollYProgress, [0.08, 0.20], [0.3, 1]);

  // Step 2 Internal micro-animations (chat bubbles slide in)
  const step2Bubble1Y = useTransform(scrollYProgress, [0.42, 0.52], [18, 0]);
  const step2Bubble1Opacity = useTransform(scrollYProgress, [0.42, 0.50], [0, 1]);
  const step2Bubble2Y = useTransform(scrollYProgress, [0.48, 0.58], [18, 0]);
  const step2Bubble2Opacity = useTransform(scrollYProgress, [0.48, 0.56], [0, 1]);

  // Step 3 Internal micro-animations (shield settling, banner slide up)
  const step3ShieldScale = useTransform(scrollYProgress, [0.73, 0.82], [0.88, 1]);
  const step3BannerY = useTransform(scrollYProgress, [0.76, 0.86], [20, 0]);
  const step3BannerOpacity = useTransform(scrollYProgress, [0.76, 0.84], [0, 1]);

  // Smooth scroll to step on click
  const scrollToStep = (idx) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const scrollDistance = containerRef.current.offsetHeight - window.innerHeight;

    // Direct scroll target percentages positioned in center of active step window:
    // Step 0: 0.20 (frame flattened and step 1 focused)
    // Step 1: 0.54 (step 2 centered)
    // Step 2: 0.84 (step 3 centered and fully locked in)
    const targetPercentages = [0.20, 0.54, 0.84];
    const targetScroll = containerTop + scrollDistance * targetPercentages[idx];

    window.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  };

  const STEPS_DATA = [
    {
      num: "01",
      title: "Post or find a job",
      desc: "Drop your pin or browse verified local gigs within 5 km of your block.",
      tag: "HYPERLOCAL 5KM",
      chipIcon: <LocateFixed size={12} />,
      chipText: "KORAMANGALA · HSR · INDIRANAGAR + MORE",
      accentColor: "#E65A1E",
    },
    {
      num: "02",
      title: "Chat & agree",
      desc: "Unlock direct phone & WhatsApp to align on project scope in minutes.",
      tag: "DIRECT CONNECT",
      chipIcon: <PhoneCall size={12} />,
      chipText: "INSTANT CALL · DIRECT WHATSAPP",
      accentColor: "#00A86B",
    },
    {
      num: "03",
      title: "Get paid securely",
      desc: "Settle via milestone escrow or direct UPI with zero commission deductions.",
      tag: "0% COMMISSION",
      chipIcon: <Lock size={12} />,
      chipText: "KEEP 100% OF YOUR EARNINGS",
      accentColor: "#E65A1E",
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="relative w-full bg-[#0A0A0C] text-white border-b-2 border-zinc-800"
      style={{ height: "240vh" }}
    >
      {/* Pinned Sticky Stage Viewport - 100svh fit for all devices */}
      <div className="sticky top-0 h-[100svh] w-full flex flex-col justify-between overflow-hidden px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6 pb-4 sm:pb-6">
        
        {/* 1. Header Row (Eyebrow + Accent Italic Headline + Average Match Note) */}
        <div className="mx-auto w-full max-w-5xl flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 shrink-0 z-20">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] text-[#E65A1E]">
                HOW IT WORKS
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#E65A1E] animate-pulse" />
            </div>

            <h2 className="mt-1 text-xl sm:text-3xl lg:text-[38px] font-black tracking-tight text-white leading-tight">
              From pin drop to payout in{" "}
              <span className="font-serif italic text-[#E65A1E] font-normal tracking-normal text-2xl sm:text-3xl lg:text-[42px] ml-0.5">
                3 steps.
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 border border-zinc-800 bg-[#141418] px-3 py-1 sm:py-1.5 shadow-[2px_2px_0px_#000] self-start sm:self-auto shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-300">
              AVERAGE MATCH TIME: &lt; 5 MINS
            </span>
          </div>
        </div>

        {/* 2. Middle Center Stage: 3D-Tilted Device Frame Mockup */}
        <div className="mx-auto w-full max-w-5xl flex-1 min-h-0 flex items-center justify-center my-auto py-2 [perspective:1200px] z-10">
          <motion.div
            style={{
              rotateX,
              rotateY,
              scale,
              opacity: frameOpacity,
              transformStyle: "preserve-3d",
            }}
            className="relative w-full max-w-4xl max-h-[60vh] sm:max-h-[500px] aspect-[16/10] sm:aspect-[16/9] rounded-xl sm:rounded-2xl border-2 border-zinc-700/80 bg-[#141418] p-2.5 sm:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(230,90,30,0.12)] transition-shadow duration-300 flex flex-col"
          >
            {/* Top Bezel Bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 hidden sm:inline text-[11px] font-mono text-zinc-500 font-bold">
                  workhop.in / how-it-works / step-{STEPS_DATA[activeStep].num}
                </span>
              </div>

              {/* Tag in header */}
              <div className="flex items-center gap-2">
                <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold text-zinc-300">
                  {STEPS_DATA[activeStep].tag}
                </span>
                <span className="border border-[#E65A1E]/40 bg-[#E65A1E]/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase text-[#E65A1E]">
                  STEP {STEPS_DATA[activeStep].num}
                </span>
              </div>
            </div>

            {/* Inner High-Resolution Canvas Screen with Cross-Fading Steps */}
            <div className="relative w-full flex-1 min-h-0 rounded-lg sm:rounded-xl bg-[#0D0D10] border border-zinc-800/80 overflow-hidden shadow-inner">
              
              {/* ───────── STEP 01: Post or find a job (Pin Drop & 5km Radius) ───────── */}
              <motion.div
                style={{
                  opacity: step1Opacity,
                  scale: step1Scale,
                  pointerEvents: activeStep === 0 ? "auto" : "none",
                }}
                className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-4 sm:p-7 gap-4 sm:gap-6 bg-gradient-to-br from-[#121216] to-[#0A0A0C]"
              >
                {/* Left Side: Artwork Visual with Expanding Radar Circle */}
                <div className="relative w-full md:w-1/2 h-full flex items-center justify-center min-h-0">
                  <div className="relative h-full max-h-[220px] sm:max-h-[260px] aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 overflow-hidden flex items-center justify-center shadow-md">
                    <motion.div
                      style={{
                        scale: step1CircleScale,
                        opacity: step1CircleOpacity,
                      }}
                      className="absolute w-40 h-40 rounded-full border-2 border-dashed border-[#E65A1E] bg-[#E65A1E]/10 pointer-events-none"
                    />

                    <img
                      src="/steps/step1_art.png"
                      alt="Step 1: Post or find a job"
                      className="relative z-10 w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Right Side: Step Description & Feature Chips */}
                <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
                  <div className="inline-flex items-center gap-1.5 border border-[#E65A1E]/40 bg-[#E65A1E]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#E65A1E] w-max">
                    <LocateFixed size={12} />
                    <span>STEP 01 · HYPERLOCAL 5KM</span>
                  </div>

                  <h3 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    Post or find a job
                  </h3>

                  <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                    Drop your pin or browse verified local gigs within 5 km of your block.
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center gap-2 text-[11px] font-black text-[#E65A1E]">
                    <LocateFixed size={14} className="shrink-0" />
                    <span>KORAMANGALA · HSR · INDIRANAGAR + MORE</span>
                  </div>
                </div>
              </motion.div>

              {/* ───────── STEP 02: Chat & agree (Instant Direct Call & WhatsApp) ───────── */}
              <motion.div
                style={{
                  opacity: step2Opacity,
                  scale: step2Scale,
                  pointerEvents: activeStep === 1 ? "auto" : "none",
                }}
                className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-4 sm:p-7 gap-4 sm:gap-6 bg-gradient-to-br from-[#121216] to-[#0A0A0C]"
              >
                {/* Left Side: Artwork Visual with Sliding Chat Bubbles */}
                <div className="relative w-full md:w-1/2 h-full flex items-center justify-center min-h-0">
                  <div className="relative h-full max-h-[220px] sm:max-h-[260px] aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 overflow-hidden flex items-center justify-center shadow-md">
                    {/* Floating simulated chat bubbles */}
                    <motion.div
                      style={{ y: step2Bubble1Y, opacity: step2Bubble1Opacity }}
                      className="absolute top-2 left-2 z-20 border border-zinc-900 bg-white px-2.5 py-1 text-[9.5px] font-black text-zinc-900 shadow-[1.5px_1.5px_0px_#121212] rounded"
                    >
                      💬 "Are you available in Koramangala today?"
                    </motion.div>

                    <motion.div
                      style={{ y: step2Bubble2Y, opacity: step2Bubble2Opacity }}
                      className="absolute bottom-2 right-2 z-20 border border-zinc-900 bg-emerald-100 px-2.5 py-1 text-[9.5px] font-black text-emerald-950 shadow-[1.5px_1.5px_0px_#121212] rounded"
                    >
                      ✓ "Yes! Unlocking phone & WhatsApp now."
                    </motion.div>

                    <img
                      src="/steps/step2_art.png"
                      alt="Step 2: Chat & agree"
                      className="relative z-10 w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Right Side: Step Description & Feature Chips */}
                <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
                  <div className="inline-flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 w-max">
                    <PhoneCall size={12} />
                    <span>STEP 02 · DIRECT CONNECT</span>
                  </div>

                  <h3 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    Chat &amp; agree
                  </h3>

                  <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                    Unlock direct phone &amp; WhatsApp to align on project scope in minutes.
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center gap-2 text-[11px] font-black text-emerald-400">
                    <PhoneCall size={14} className="shrink-0" />
                    <span>INSTANT CALL · DIRECT WHATSAPP</span>
                  </div>
                </div>
              </motion.div>

              {/* ───────── STEP 03: Get paid securely (Escrow / UPI & 0% Commission) ───────── */}
              <motion.div
                style={{
                  opacity: step3Opacity,
                  scale: step3Scale,
                  pointerEvents: activeStep === 2 ? "auto" : "none",
                }}
                className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-4 sm:p-7 gap-4 sm:gap-6 bg-gradient-to-br from-[#121216] to-[#0A0A0C]"
              >
                {/* Left Side: Artwork Visual with Escrow Shield & 0% Banner */}
                <div className="relative w-full md:w-1/2 h-full flex items-center justify-center min-h-0">
                  <div className="relative h-full max-h-[220px] sm:max-h-[260px] aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 overflow-hidden flex items-center justify-center shadow-md">
                    {/* Shield pulse */}
                    <motion.div
                      style={{ scale: step3ShieldScale }}
                      className="absolute top-2 right-2 z-20 border border-zinc-900 bg-amber-200 px-2 py-0.5 text-[9px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_#121212]"
                    >
                      🛡️ MILESTONE ESCROW
                    </motion.div>

                    {/* Animated 0% Commission Banner */}
                    <motion.div
                      style={{ y: step3BannerY, opacity: step3BannerOpacity }}
                      className="absolute bottom-2 inset-x-2 z-20 border border-zinc-900 bg-[#E65A1E] text-white py-1 px-2 text-[10px] font-black uppercase text-center shadow-[1.5px_1.5px_0px_#121212]"
                    >
                      0% COMMISSION · KEEP 100%
                    </motion.div>

                    <img
                      src="/steps/step3_art.png"
                      alt="Step 3: Get paid securely"
                      className="relative z-10 w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Right Side: Step Description & Feature Chips */}
                <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
                  <div className="inline-flex items-center gap-1.5 border border-[#E65A1E]/40 bg-[#E65A1E]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#E65A1E] w-max">
                    <Lock size={12} />
                    <span>STEP 03 · 0% COMMISSION</span>
                  </div>

                  <h3 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    Get paid securely
                  </h3>

                  <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                    Settle via milestone escrow or direct UPI with zero commission deductions.
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center gap-2 text-[11px] font-black text-[#E65A1E]">
                    <Lock size={14} className="shrink-0" />
                    <span>KEEP 100% OF YOUR EARNINGS</span>
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>

        {/* 3. Bottom Step Navigation & Interactive Progress Tracker */}
        <div className="mx-auto w-full max-w-4xl shrink-0 z-20 pt-1 pb-1">
          {/* Progress bar line */}
          <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden mb-2">
            <motion.div
              style={{ width: scrollBarHeight }}
              className="h-full bg-gradient-to-r from-[#E65A1E] via-amber-500 to-[#E65A1E]"
            />
          </div>

          {/* 3 Clickable Step Markers (01 / 02 / 03) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {STEPS_DATA.map((s, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => scrollToStep(idx)}
                  className={`text-left p-2 sm:p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "border-[#E65A1E] bg-[#1A1A20] shadow-[2px_2px_0px_#E65A1E]"
                      : "border-zinc-800 bg-[#101014] hover:border-zinc-700 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-black ${
                        isActive ? "text-[#E65A1E]" : "text-zinc-500"
                      }`}
                    >
                      {s.num}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-500 hidden sm:inline">
                      {s.tag}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 text-xs sm:text-sm font-black truncate leading-tight ${
                      isActive ? "text-white" : "text-zinc-400"
                    }`}
                  >
                    {s.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
