import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { LocateFixed, PhoneCall, Lock, Sparkles } from "lucide-react";

/**
 * PinnedHowItWorks - Scroll-driven 3D pinned showcase for WorkHop
 *
 * Each step is revealed with its own window animation sequence as you scroll:
 * - Step 1 tilts & flattens into place with hyperlocal radar animation
 * - Step 2 transitions into view with interactive window card & chat bubbles
 * - Step 3 reveals with escrow shield protection & 0% commission banner
 *
 * The step navigation tabs are integrated directly with the window experience,
 * completely eliminating any awkward empty black space below the frame.
 */
export default function PinnedHowItWorks() {
  const containerRef = useRef(null);

  // Track scroll through the pinned container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Active step index derived from scroll progress
  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.36) {
      setActiveStep(0);
    } else if (latest < 0.68) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  });

  // ─── Step 1 Window Animations (0.00 -> 0.36) ───
  // Tilts in from rotateX 18deg and flattens to 0deg by 0.15, stays flat until 0.32, then tilts slightly away
  const step1RotateX = useTransform(scrollYProgress, [0, 0.14, 0.32, 0.38], [18, 0, 0, -10]);
  const step1RotateY = useTransform(scrollYProgress, [0, 0.14, 0.32, 0.38], [-4, 0, 0, 3]);
  const step1Scale = useTransform(scrollYProgress, [0, 0.14, 0.32, 0.38], [0.93, 1, 1, 0.94]);
  const step1Opacity = useTransform(scrollYProgress, [0, 0.05, 0.32, 0.38], [0.9, 1, 1, 0]);
  const step1Y = useTransform(scrollYProgress, [0, 0.14, 0.32, 0.38], [20, 0, 0, -30]);

  // Step 1 micro-animations
  const step1CircleScale = useTransform(scrollYProgress, [0.06, 0.26], [0.7, 1.08]);
  const step1CircleOpacity = useTransform(scrollYProgress, [0.04, 0.16], [0.2, 1]);

  // ─── Step 2 Window Animations (0.34 -> 0.68) ───
  // Enters with 3D tilt up (rotateX: 18deg -> 0deg), stays flat, then exits
  const step2RotateX = useTransform(scrollYProgress, [0.34, 0.44, 0.62, 0.70], [18, 0, 0, -10]);
  const step2RotateY = useTransform(scrollYProgress, [0.34, 0.44, 0.62, 0.70], [-4, 0, 0, 3]);
  const step2Scale = useTransform(scrollYProgress, [0.34, 0.44, 0.62, 0.70], [0.93, 1, 1, 0.94]);
  const step2Opacity = useTransform(scrollYProgress, [0.34, 0.40, 0.64, 0.70], [0, 1, 1, 0]);
  const step2Y = useTransform(scrollYProgress, [0.34, 0.44, 0.62, 0.70], [30, 0, 0, -30]);

  // Step 2 micro-animations (chat bubbles)
  const step2Bubble1Y = useTransform(scrollYProgress, [0.42, 0.52], [16, 0]);
  const step2Bubble1Opacity = useTransform(scrollYProgress, [0.42, 0.50], [0, 1]);
  const step2Bubble2Y = useTransform(scrollYProgress, [0.48, 0.58], [16, 0]);
  const step2Bubble2Opacity = useTransform(scrollYProgress, [0.48, 0.56], [0, 1]);

  // ─── Step 3 Window Animations (0.66 -> 1.00) ───
  // Enters with 3D tilt up (rotateX: 18deg -> 0deg), locks into flat position
  const step3RotateX = useTransform(scrollYProgress, [0.66, 0.76, 1], [18, 0, 0]);
  const step3RotateY = useTransform(scrollYProgress, [0.66, 0.76, 1], [-4, 0, 0]);
  const step3Scale = useTransform(scrollYProgress, [0.66, 0.76, 1], [0.93, 1, 1]);
  const step3Opacity = useTransform(scrollYProgress, [0.66, 0.72, 1], [0, 1, 1]);
  const step3Y = useTransform(scrollYProgress, [0.66, 0.76, 1], [30, 0, 0]);

  // Step 3 micro-animations
  const step3ShieldScale = useTransform(scrollYProgress, [0.74, 0.84], [0.85, 1]);
  const step3BannerY = useTransform(scrollYProgress, [0.78, 0.88], [18, 0]);
  const step3BannerOpacity = useTransform(scrollYProgress, [0.78, 0.86], [0, 1]);

  // Live progress fills for each step tab
  const step1Fill = useTransform(scrollYProgress, [0.00, 0.34], ["0%", "100%"]);
  const step2Fill = useTransform(scrollYProgress, [0.34, 0.66], ["0%", "100%"]);
  const step3Fill = useTransform(scrollYProgress, [0.66, 0.98], ["0%", "100%"]);
  const stepFills = [step1Fill, step2Fill, step3Fill];

  // Smooth scroll to step on click
  const scrollToStep = (idx) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const scrollDistance = containerRef.current.offsetHeight - window.innerHeight;

    const targetPercentages = [0.12, 0.48, 0.82];
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
      style={{ height: "230vh" }}
    >
      {/* Sticky Stage Viewport - Perfectly framed to fill 100svh without excess bottom dead space */}
      <div className="sticky top-0 h-[100svh] w-full flex flex-col justify-between overflow-hidden px-4 sm:px-8 lg:px-14 pt-4 sm:pt-6 pb-4 sm:pb-6">
        
        {/* 1. Header Row (Eyebrow + Headline + Match time note) */}
        <div className="mx-auto w-full max-w-5xl flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 shrink-0 z-30">
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

        {/* 2. Middle Center Stage: Scroll-Driven 3D Windows for each step */}
        <div className="mx-auto w-full max-w-5xl flex-1 min-h-0 flex items-center justify-center my-auto py-2 [perspective:1200px] relative z-20">
          
          {/* ═══════════ WINDOW 1: STEP 01 (Post or find a job) ═══════════ */}
          <motion.div
            style={{
              rotateX: step1RotateX,
              rotateY: step1RotateY,
              scale: step1Scale,
              opacity: step1Opacity,
              y: step1Y,
              transformStyle: "preserve-3d",
              pointerEvents: activeStep === 0 ? "auto" : "none",
            }}
            className="absolute inset-x-0 mx-auto w-full max-w-4xl max-h-[58vh] sm:max-h-[490px] aspect-[16/10] sm:aspect-[16/9.2] rounded-xl sm:rounded-2xl border-2 border-zinc-700/80 bg-[#141418] p-2.5 sm:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(230,90,30,0.12)] flex flex-col"
          >
            {/* Window Top Chrome Bezel */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 hidden sm:inline text-[11px] font-mono text-zinc-500 font-bold">
                  workhop.in / step-01 / post-or-find-a-job
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold text-zinc-300">
                  HYPERLOCAL 5KM
                </span>
                <span className="border border-[#E65A1E]/40 bg-[#E65A1E]/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase text-[#E65A1E]">
                  STEP 01
                </span>
              </div>
            </div>

            {/* Window Body Screen */}
            <div className="relative w-full flex-1 min-h-0 rounded-lg sm:rounded-xl bg-[#0D0D10] border border-zinc-800/80 overflow-hidden shadow-inner flex flex-col md:flex-row items-center justify-between p-4 sm:p-7 gap-4 sm:gap-6 bg-gradient-to-br from-[#121216] to-[#0A0A0C]">
              {/* Artwork Visual */}
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

              {/* Text Description */}
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
            </div>
          </motion.div>

          {/* ═══════════ WINDOW 2: STEP 02 (Chat & agree) ═══════════ */}
          <motion.div
            style={{
              rotateX: step2RotateX,
              rotateY: step2RotateY,
              scale: step2Scale,
              opacity: step2Opacity,
              y: step2Y,
              transformStyle: "preserve-3d",
              pointerEvents: activeStep === 1 ? "auto" : "none",
            }}
            className="absolute inset-x-0 mx-auto w-full max-w-4xl max-h-[58vh] sm:max-h-[490px] aspect-[16/10] sm:aspect-[16/9.2] rounded-xl sm:rounded-2xl border-2 border-emerald-600/70 bg-[#141418] p-2.5 sm:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(0,168,107,0.15)] flex flex-col"
          >
            {/* Window Top Chrome Bezel */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 hidden sm:inline text-[11px] font-mono text-zinc-500 font-bold">
                  workhop.in / step-02 / chat-and-agree
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold text-zinc-300">
                  DIRECT CONNECT
                </span>
                <span className="border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase text-emerald-400">
                  STEP 02
                </span>
              </div>
            </div>

            {/* Window Body Screen */}
            <div className="relative w-full flex-1 min-h-0 rounded-lg sm:rounded-xl bg-[#0D0D10] border border-zinc-800/80 overflow-hidden shadow-inner flex flex-col md:flex-row items-center justify-between p-4 sm:p-7 gap-4 sm:gap-6 bg-gradient-to-br from-[#121216] to-[#0A0A0C]">
              {/* Artwork Visual */}
              <div className="relative w-full md:w-1/2 h-full flex items-center justify-center min-h-0">
                <div className="relative h-full max-h-[220px] sm:max-h-[260px] aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 overflow-hidden flex items-center justify-center shadow-md">
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

              {/* Text Description */}
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
            </div>
          </motion.div>

          {/* ═══════════ WINDOW 3: STEP 03 (Get paid securely) ═══════════ */}
          <motion.div
            style={{
              rotateX: step3RotateX,
              rotateY: step3RotateY,
              scale: step3Scale,
              opacity: step3Opacity,
              y: step3Y,
              transformStyle: "preserve-3d",
              pointerEvents: activeStep === 2 ? "auto" : "none",
            }}
            className="absolute inset-x-0 mx-auto w-full max-w-4xl max-h-[58vh] sm:max-h-[490px] aspect-[16/10] sm:aspect-[16/9.2] rounded-xl sm:rounded-2xl border-2 border-amber-600/70 bg-[#141418] p-2.5 sm:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(230,90,30,0.15)] flex flex-col"
          >
            {/* Window Top Chrome Bezel */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 hidden sm:inline text-[11px] font-mono text-zinc-500 font-bold">
                  workhop.in / step-03 / get-paid-securely
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold text-zinc-300">
                  0% COMMISSION
                </span>
                <span className="border border-[#E65A1E]/40 bg-[#E65A1E]/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase text-[#E65A1E]">
                  STEP 03
                </span>
              </div>
            </div>

            {/* Window Body Screen */}
            <div className="relative w-full flex-1 min-h-0 rounded-lg sm:rounded-xl bg-[#0D0D10] border border-zinc-800/80 overflow-hidden shadow-inner flex flex-col md:flex-row items-center justify-between p-4 sm:p-7 gap-4 sm:gap-6 bg-gradient-to-br from-[#121216] to-[#0A0A0C]">
              {/* Artwork Visual */}
              <div className="relative w-full md:w-1/2 h-full flex items-center justify-center min-h-0">
                <div className="relative h-full max-h-[220px] sm:max-h-[260px] aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 overflow-hidden flex items-center justify-center shadow-md">
                  <motion.div
                    style={{ scale: step3ShieldScale }}
                    className="absolute top-2 right-2 z-20 border border-zinc-900 bg-amber-200 px-2 py-0.5 text-[9px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_#121212]"
                  >
                    🛡️ MILESTONE ESCROW
                  </motion.div>

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

              {/* Text Description */}
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
            </div>
          </motion.div>

        </div>

        {/* 3. Bottom Step Navigation & Interactive Progress Tracker (Compact & snug under window) */}
        <div className="mx-auto w-full max-w-4xl shrink-0 z-30 pt-1 pb-1">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {STEPS_DATA.map((s, idx) => {
              const isActive = activeStep === idx;
              const isPassed = activeStep > idx;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => scrollToStep(idx)}
                  className={`group relative text-left p-2 sm:p-2.5 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                    isActive
                      ? "border-[#E65A1E] bg-[#1A1A20] shadow-[0_8px_20px_-4px_rgba(230,90,30,0.35)] scale-[1.02]"
                      : isPassed
                      ? "border-zinc-700/80 bg-[#121216] opacity-90 hover:opacity-100"
                      : "border-zinc-800 bg-[#0E0E12] opacity-50 hover:opacity-80"
                  }`}
                >
                  {/* Top Live Progress Bar for THIS Step that scrubs with scroll */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-zinc-800/80">
                    <motion.div
                      style={{
                        width: isPassed ? "100%" : isActive ? stepFills[idx] : "0%",
                      }}
                      className="h-full bg-gradient-to-r from-[#E65A1E] to-amber-400"
                    />
                  </div>

                  {/* Header Row of the Tab */}
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-xs font-mono font-black transition-colors ${
                        isActive
                          ? "text-[#E65A1E]"
                          : isPassed
                          ? "text-zinc-300"
                          : "text-zinc-600 group-hover:text-zinc-400"
                      }`}
                    >
                      {s.num}
                    </span>
                    <span
                      className={`text-[9px] font-bold tracking-wider hidden sm:inline px-1.5 py-0.5 rounded transition-colors ${
                        isActive
                          ? "bg-[#E65A1E]/20 text-[#E65A1E] border border-[#E65A1E]/30"
                          : isPassed
                          ? "text-zinc-400"
                          : "text-zinc-600"
                      }`}
                    >
                      {s.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <p
                    className={`mt-0.5 text-xs sm:text-sm font-black truncate leading-tight transition-colors ${
                      isActive
                        ? "text-white"
                        : isPassed
                        ? "text-zinc-300"
                        : "text-zinc-500 group-hover:text-zinc-400"
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
