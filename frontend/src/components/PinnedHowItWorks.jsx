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

  // Track scroll through the 350vh pinned container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // 1. Entry 3D Device Tilt -> Flatten over the first 0% - 25% of scroll
  // Tilted: rotateX ~ 22deg, rotateY ~ -4deg, scale ~ 0.9, perspective 1100px
  // Flattens: rotateX 0deg, rotateY 0deg, scale 1.0
  const rotateX = useTransform(scrollYProgress, [0, 0.25], [22, 0]);
  const rotateY = useTransform(scrollYProgress, [0, 0.25], [-4, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.25, 0.9, 1], [0.92, 1, 1, 0.94]);
  const frameOpacity = useTransform(scrollYProgress, [0, 0.08, 0.92, 1], [0.85, 1, 1, 0.7]);
  const scrollBarHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // Active step index (0, 1, 2) derived from scroll progress
  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // 0.00 - 0.25: Entrance & Flatten (Step 1 active)
    // 0.25 - 0.52: Step 1 (Post or find a job)
    // 0.52 - 0.78: Step 2 (Chat & agree)
    // 0.78 - 1.00: Step 3 (Get paid securely)
    if (latest < 0.52) {
      setActiveStep(0);
    } else if (latest < 0.78) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  });

  // Step Opacity & Transitions for Content Inside Frame
  // Step 1: active from 0 to 0.52, fades out 0.48 - 0.53
  const step1Opacity = useTransform(scrollYProgress, [0, 0.48, 0.53], [1, 1, 0]);
  const step1Scale = useTransform(scrollYProgress, [0, 0.48, 0.53], [1, 1, 0.95]);

  // Step 2: fades in 0.48 - 0.53, active until 0.75, fades out 0.74 - 0.78
  const step2Opacity = useTransform(scrollYProgress, [0.49, 0.54, 0.74, 0.78], [0, 1, 1, 0]);
  const step2Scale = useTransform(scrollYProgress, [0.49, 0.54, 0.74, 0.78], [0.95, 1, 1, 0.95]);

  // Step 3: fades in 0.74 - 0.79, active until 1.00
  const step3Opacity = useTransform(scrollYProgress, [0.74, 0.79, 1], [0, 1, 1]);
  const step3Scale = useTransform(scrollYProgress, [0.74, 0.79, 1], [0.95, 1, 1]);

  // Step 1 Internal micro-animations
  const step1CircleScale = useTransform(scrollYProgress, [0.15, 0.38], [0.65, 1.05]);
  const step1CircleOpacity = useTransform(scrollYProgress, [0.12, 0.25], [0.3, 1]);

  // Step 2 Internal micro-animations (chat bubbles slide in)
  const step2Bubble1Y = useTransform(scrollYProgress, [0.52, 0.62], [24, 0]);
  const step2Bubble1Opacity = useTransform(scrollYProgress, [0.52, 0.6], [0, 1]);
  const step2Bubble2Y = useTransform(scrollYProgress, [0.58, 0.68], [24, 0]);
  const step2Bubble2Opacity = useTransform(scrollYProgress, [0.58, 0.66], [0, 1]);

  // Step 3 Internal micro-animations (shield settling, banner slide up)
  const step3ShieldScale = useTransform(scrollYProgress, [0.77, 0.86], [0.85, 1]);
  const step3BannerY = useTransform(scrollYProgress, [0.82, 0.92], [28, 0]);
  const step3BannerOpacity = useTransform(scrollYProgress, [0.82, 0.9], [0, 1]);

  // Smooth scroll to step on click
  const scrollToStep = (idx) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const scrollDistance = containerRef.current.offsetHeight - window.innerHeight;

    // Targets: Step 0 -> ~20%, Step 1 -> ~56%, Step 2 -> ~85%
    const targetPercentages = [0.22, 0.58, 0.88];
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
      chipIcon: <LocateFixed size={13} />,
      chipText: "KORAMANGALA · HSR · INDIRANAGAR + MORE",
      accentColor: "#E65A1E",
    },
    {
      num: "02",
      title: "Chat & agree",
      desc: "Unlock direct phone & WhatsApp to align on project scope in minutes.",
      tag: "DIRECT CONNECT",
      chipIcon: <PhoneCall size={13} />,
      chipText: "INSTANT CALL · DIRECT WHATSAPP",
      accentColor: "#00A86B",
    },
    {
      num: "03",
      title: "Get paid securely",
      desc: "Settle via milestone escrow or direct UPI with zero commission deductions.",
      tag: "0% COMMISSION",
      chipIcon: <Lock size={13} />,
      chipText: "KEEP 100% OF YOUR EARNINGS",
      accentColor: "#E65A1E",
    },
  ];

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="relative w-full bg-[#0A0A0C] text-white border-b-2 border-zinc-800"
      style={{ height: "360vh" }}
    >
      {/* Pinned Sticky Stage Viewport */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden px-4 sm:px-8 lg:px-14 py-6 sm:py-8">
        
        {/* 1. Header Row (Eyebrow + Accent Italic Headline + Average Match Note) */}
        <div className="mx-auto w-full max-w-6xl flex flex-col sm:flex-row sm:items-end justify-between gap-4 shrink-0 z-20">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.22em] text-[#E65A1E]">
                HOW IT WORKS
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#E65A1E] animate-pulse" />
            </div>

            <h2 className="mt-2 text-2xl xs:text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-white leading-[1.08]">
              From pin drop to payout in{" "}
              <span className="font-serif italic text-[#E65A1E] font-normal tracking-normal text-3xl sm:text-4xl lg:text-[46px] ml-0.5">
                3 steps.
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 border border-zinc-800 bg-[#141418] px-3.5 py-1.5 shadow-[2px_2px_0px_#000]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-300">
              AVERAGE MATCH TIME: &lt; 5 MINS
            </span>
          </div>
        </div>

        {/* 2. Middle Center Stage: 3D-Tilted Device Frame Mockup that flattens */}
        <div className="mx-auto w-full max-w-5xl my-auto py-2 sm:py-4 flex items-center justify-center [perspective:1200px] z-10">
          <motion.div
            style={{
              rotateX,
              rotateY,
              scale,
              opacity: frameOpacity,
              transformStyle: "preserve-3d",
            }}
            className="relative w-full max-w-4xl aspect-[16/10] sm:aspect-[16/9.5] rounded-xl sm:rounded-2xl border-2 border-zinc-700/80 bg-[#141418] p-2.5 sm:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(230,90,30,0.12)] transition-shadow duration-300"
          >
            {/* Laptop / Tablet Top Bezel Bar (Reference UI style) */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 sm:mb-3 px-1 sm:px-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
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
            <div className="relative w-full h-[calc(100%-36px)] sm:h-[calc(100%-42px)] rounded-lg sm:rounded-xl bg-[#0D0D10] border border-zinc-800/80 overflow-hidden shadow-inner flex items-center justify-center">
              
              {/* ───────── STEP 01: Post or find a job (Pin Drop & 5km Radius) ───────── */}
              <motion.div
                style={{
                  opacity: step1Opacity,
                  scale: step1Scale,
                  pointerEvents: activeStep === 0 ? "auto" : "none",
                }}
                className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-4 sm:p-8 gap-4 sm:gap-8 bg-gradient-to-br from-[#121216] to-[#0A0A0C]"
              >
                {/* Left Side: Artwork Visual with Expanding Radar Circle & Micro-animation */}
                <div className="relative w-full md:w-1/2 h-full flex items-center justify-center">
                  <div className="relative w-full max-w-[320px] aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 overflow-hidden flex items-center justify-center shadow-lg">
                    {/* Pulsing 5km radius animation behind the art */}
                    <motion.div
                      style={{
                        scale: step1CircleScale,
                        opacity: step1CircleOpacity,
                      }}
                      className="absolute w-44 h-44 rounded-full border-2 border-dashed border-[#E65A1E] bg-[#E65A1E]/10 pointer-events-none"
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

                  <h3 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    Post or find a job
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                    Drop your pin or browse verified local gigs within 5 km of your block.
                  </p>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-[11px] font-black text-[#E65A1E]">
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
                className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-4 sm:p-8 gap-4 sm:gap-8 bg-gradient-to-br from-[#121216] to-[#0A0A0C]"
              >
                {/* Left Side: Artwork Visual with Sliding Chat Bubbles */}
                <div className="relative w-full md:w-1/2 h-full flex items-center justify-center">
                  <div className="relative w-full max-w-[320px] aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 overflow-hidden flex items-center justify-center shadow-lg">
                    {/* Floating simulated chat bubbles */}
                    <motion.div
                      style={{ y: step2Bubble1Y, opacity: step2Bubble1Opacity }}
                      className="absolute top-4 left-4 z-20 border border-zinc-900 bg-white px-2.5 py-1 text-[10px] font-black text-zinc-900 shadow-[2px_2px_0px_#121212] rounded-md"
                    >
                      💬 "Are you available in Koramangala today?"
                    </motion.div>

                    <motion.div
                      style={{ y: step2Bubble2Y, opacity: step2Bubble2Opacity }}
                      className="absolute bottom-4 right-4 z-20 border border-zinc-900 bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-950 shadow-[2px_2px_0px_#121212] rounded-md"
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

                  <h3 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    Chat &amp; agree
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                    Unlock direct phone &amp; WhatsApp to align on project scope in minutes.
                  </p>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-[11px] font-black text-emerald-400">
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
                className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-4 sm:p-8 gap-4 sm:gap-8 bg-gradient-to-br from-[#121216] to-[#0A0A0C]"
              >
                {/* Left Side: Artwork Visual with Escrow Shield & 0% Banner */}
                <div className="relative w-full md:w-1/2 h-full flex items-center justify-center">
                  <div className="relative w-full max-w-[320px] aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 overflow-hidden flex items-center justify-center shadow-lg">
                    {/* Shield pulse */}
                    <motion.div
                      style={{ scale: step3ShieldScale }}
                      className="absolute top-3 right-3 z-20 border border-zinc-900 bg-amber-200 px-2 py-0.5 text-[9px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_#121212]"
                    >
                      🛡️ MILESTONE ESCROW PROTECTED
                    </motion.div>

                    {/* Animated 0% Commission Banner */}
                    <motion.div
                      style={{ y: step3BannerY, opacity: step3BannerOpacity }}
                      className="absolute bottom-2 inset-x-2 z-20 border border-zinc-900 bg-[#E65A1E] text-white py-1 px-2 text-[10px] font-black uppercase text-center shadow-[2px_2px_0px_#121212]"
                    >
                      0% COMMISSION · KEEP 100% OF YOUR EARNINGS
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

                  <h3 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    Get paid securely
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                    Settle via milestone escrow or direct UPI with zero commission deductions.
                  </p>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-[11px] font-black text-[#E65A1E]">
                    <Lock size={14} className="shrink-0" />
                    <span>KEEP 100% OF YOUR EARNINGS</span>
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>

        {/* 3. Bottom Step Navigation & Interactive Progress Tracker */}
        <div className="mx-auto w-full max-w-4xl shrink-0 z-20 pt-2">
          {/* Progress bar line */}
          <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden mb-3">
            <motion.div
              style={{ width: scrollBarHeight }}
              className="h-full bg-gradient-to-r from-[#E65A1E] via-amber-500 to-[#E65A1E]"
            />
          </div>

          {/* 3 Clickable Step Markers (01 / 02 / 03) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {STEPS_DATA.map((s, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => scrollToStep(idx)}
                  className={`text-left p-2 sm:p-2.5 rounded-lg border transition-all duration-200 ${
                    isActive
                      ? "border-[#E65A1E] bg-[#1A1A20] shadow-[2px_2px_0px_#E65A1E]"
                      : "border-zinc-800 bg-[#101014] hover:border-zinc-700 opacity-60 hover:opacity-100"
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
                    className={`mt-0.5 text-xs sm:text-sm font-black truncate ${
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
