import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from "motion/react";
import { LocateFixed, PhoneCall, Lock } from "lucide-react";

/**
 * Steps Data Configuration
 * Exact copy, tags, and icons as specified.
 */
const STEPS_DATA = [
  {
    num: "01",
    title: "Post or find a job",
    desc: "Drop your pin or browse verified local gigs within 5 km of your block.",
    tag: "HYPERLOCAL 5KM",
    breadcrumb: "workhop.in / step-01 / post-or-find-a-job",
    chipIcon: LocateFixed,
    chipText: "KORAMANGALA · HSR · INDIRANAGAR + MORE",
    art: "/steps/step1_art.png",
    artAlt: "Step 1: Hyperlocal pin drop radar map",
    accentBorder: "border-[#E65A1E]",
    glowColor: "rgba(230,90,30,0.18)",
  },
  {
    num: "02",
    title: "Chat & agree",
    desc: "Unlock direct phone & WhatsApp to align on project scope in minutes.",
    tag: "DIRECT CONNECT",
    breadcrumb: "workhop.in / step-02 / chat-and-agree",
    chipIcon: PhoneCall,
    chipText: "INSTANT CALL · DIRECT WHATSAPP",
    art: "/steps/step2_art.png",
    artAlt: "Step 2: Instant phone call and direct WhatsApp connect",
    accentBorder: "border-emerald-500",
    glowColor: "rgba(16,185,129,0.18)",
  },
  {
    num: "03",
    title: "Get paid securely",
    desc: "Settle via milestone escrow or direct UPI with zero commission deductions.",
    tag: "0% COMMISSION",
    breadcrumb: "workhop.in / step-03 / get-paid-securely",
    chipIcon: Lock,
    chipText: "KEEP 100% OF YOUR EARNINGS",
    art: "/steps/step3_art.png",
    artAlt: "Step 3: Milestone escrow protection and direct UPI payout",
    accentBorder: "border-[#E65A1E]",
    glowColor: "rgba(230,90,30,0.18)",
  },
];

/**
 * Reusable WindowFrame Component
 * 100% Solid Opaque panel background (#141418 and #0D0D10) - zero see-through ghosting.
 */
function WindowFrame({ step, stepIndex, innerAnimations = {}, dimOverlayOpacity }) {
  const ChipIcon = step.chipIcon;

  return (
    <div
      className={`relative w-full max-w-5xl h-auto md:h-full md:max-h-[500px] md:aspect-[16/9.5] rounded-xl sm:rounded-2xl border-2 ${step.accentBorder} bg-[#141418] p-3 sm:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] flex flex-col select-none`}
      style={{
        boxShadow: `0 25px 60px -15px rgba(0,0,0,0.95), 0 0 40px ${step.glowColor}`,
        backgroundColor: "#141418", // 100% solid, fully opaque
      }}
    >
      {/* 1. Browser-style Window Chrome */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 px-1 shrink-0 bg-[#141418]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="ml-2 hidden sm:inline text-[11px] font-mono text-zinc-400 font-bold tracking-tight">
            {step.breadcrumb}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="border border-zinc-700 bg-zinc-900 px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[10px] font-mono font-bold text-zinc-300">
            {step.tag}
          </span>
          <span className="border border-[#E65A1E]/40 bg-[#E65A1E]/20 px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[10px] font-black uppercase text-[#E65A1E]">
            STEP {step.num}
          </span>
        </div>
      </div>

      {/* 2. Inner Canvas Screen - 100% Solid Dark Background */}
      <div
        className="relative w-full flex-1 rounded-lg sm:rounded-xl border border-zinc-800/80 overflow-hidden shadow-inner flex flex-col md:flex-row items-center justify-between p-3.5 sm:p-6 lg:p-7 gap-4 sm:gap-6"
        style={{ backgroundColor: "#0D0D10" }} // 100% solid, fully opaque
      >
        {/* Artwork Visual with scrubbed micro-animations */}
        <div className="relative w-full md:w-[52%] lg:w-[54%] flex items-center justify-center shrink-0">
          <motion.div
            style={innerAnimations.artStyle || {}}
            className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[340px] md:max-w-none md:h-full max-h-[220px] xs:max-h-[260px] sm:max-h-[300px] lg:max-h-[340px] aspect-[4/3] xs:aspect-[16/10] md:aspect-square rounded-xl bg-[#FAF7F2] border-2 border-zinc-900 p-2 sm:p-3 overflow-hidden flex items-center justify-center shadow-md"
          >
            {/* Step 1: Pulsing 5km radar ring */}
            {stepIndex === 0 && (
              <motion.div
                style={innerAnimations.radarStyle || {}}
                className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-[#E65A1E] bg-[#E65A1E]/15 pointer-events-none"
              />
            )}

            {/* Step 2: Chat bubbles */}
            {stepIndex === 1 && (
              <>
                <motion.div
                  style={innerAnimations.bubble1Style || {}}
                  className="absolute top-2 left-2 z-20 border border-zinc-900 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8.5px] sm:text-[9.5px] font-black text-zinc-900 shadow-[1.5px_1.5px_0px_#121212] rounded"
                >
                  💬 "Are you available in Koramangala today?"
                </motion.div>
                <motion.div
                  style={innerAnimations.bubble2Style || {}}
                  className="absolute bottom-2 right-2 z-20 border border-zinc-900 bg-emerald-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8.5px] sm:text-[9.5px] font-black text-emerald-950 shadow-[1.5px_1.5px_0px_#121212] rounded"
                >
                  ✓ "Yes! Unlocking phone & WhatsApp now."
                </motion.div>
              </>
            )}

            {/* Step 3: Shield & 0% banner */}
            {stepIndex === 2 && (
              <>
                <motion.div
                  style={innerAnimations.shieldStyle || {}}
                  className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 border border-zinc-900 bg-amber-200 px-1.5 py-0.5 sm:px-2 text-[8.5px] sm:text-[9.5px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_#121212]"
                >
                  🛡️ MILESTONE ESCROW
                </motion.div>
                <motion.div
                  style={innerAnimations.bannerStyle || {}}
                  className="absolute bottom-2 inset-x-2 sm:bottom-2.5 sm:inset-x-2.5 z-20 border border-zinc-900 bg-[#E65A1E] text-white py-0.5 sm:py-1 px-2 text-[9px] sm:text-[11px] font-black uppercase text-center shadow-[1.5px_1.5px_0px_#121212]"
                >
                  0% COMMISSION · KEEP 100%
                </motion.div>
              </>
            )}

            <img
              src={step.art}
              alt={step.artAlt}
              loading={stepIndex === 0 ? "eager" : "lazy"}
              decoding="async"
              className="relative z-10 w-full h-full object-contain pointer-events-none scale-105"
            />
          </motion.div>
        </div>

        {/* Step Description & Feature Chips */}
        <motion.div
          style={innerAnimations.copyStyle || {}}
          className="w-full md:w-[48%] lg:w-[46%] flex flex-col justify-center text-left"
        >
          <div
            className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider w-max ${
              stepIndex === 1
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                : "border-[#E65A1E]/40 bg-[#E65A1E]/20 text-[#E65A1E]"
            }`}
          >
            <ChipIcon size={12} />
            <span>STEP {step.num} · {step.tag}</span>
          </div>

          <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {step.title}
          </h3>

          <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
            {step.desc}
          </p>

          <div
            className={`mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-zinc-800 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-black ${
              stepIndex === 1 ? "text-emerald-400" : "text-[#E65A1E]"
            }`}
          >
            <ChipIcon size={13} className="shrink-0" />
            <span className="truncate">{step.chipText}</span>
          </div>
        </motion.div>

      </div>

      {/* 3. Dark Depth Overlay - dims background window when covered by the next card */}
      {dimOverlayOpacity && (
        <motion.div
          style={{ opacity: dimOverlayOpacity }}
          className="absolute inset-0 bg-black/60 pointer-events-none rounded-xl sm:rounded-2xl z-30"
        />
      )}
    </div>
  );
}

/**
 * PinnedHowItWorks - Main Scroll-Driven Showcase
 */
export default function PinnedHowItWorks() {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/tablet screen width (< 900px)
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 900);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Track scroll across the 400vh pinned sequence
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Track active step tab (switches at 0.35 and 0.68)
  const [activeStep, setActiveStep] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.35) {
      setActiveStep(0);
    } else if (latest < 0.68) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  });

  // Continuous 0% to 100% Progress Bar
  const overallProgressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // ══════════════════════════════════════════════════════════════════
  // STACKED-CARD CHOREOGRAPHY (SOLID OPAQUE, NEVER CROSS-FADED)
  // ══════════════════════════════════════════════════════════════════

  // ─── WINDOW 1 (Step 01 - Bottom of stack, z-index 10) ───
  // Enters: 0% -> 12% (tilt 22deg to 0deg, translateY 25% -> 0%)
  // Holds flat: 12% -> 30%
  // Gets covered by Window 2 starting at 30%: scales down to 0.95 and dims
  const w1RotateX = useTransform(scrollYProgress, [0, 0.12], [22, 0]);
  const w1RotateY = useTransform(scrollYProgress, [0, 0.12], [-4, 0]);
  const w1TranslateY = useTransform(scrollYProgress, [0, 0.12], ["25%", "0%"]);
  const w1Scale = useTransform(scrollYProgress, [0, 0.12, 0.30, 0.44], [0.92, 1, 1, 0.95]);
  const w1DimOpacity = useTransform(scrollYProgress, [0.30, 0.44], [0, 0.65]);
  // Visibility: hidden once Window 2 completely covers it (> 0.46) to conserve GPU
  const w1Visibility = useTransform(scrollYProgress, (v) => (v > 0.46 ? "hidden" : "visible"));

  // Window 1 inner micro-animations
  const w1RadarScale = useTransform(scrollYProgress, [0.06, 0.22], [0.7, 1.1]);
  const w1RadarOpacity = useTransform(scrollYProgress, [0.04, 0.16], [0.2, 1]);
  const w1CopyX = useTransform(scrollYProgress, [0.06, 0.18], [20, 0]);
  const w1CopyOpacity = useTransform(scrollYProgress, [0.06, 0.16], [0.5, 1]);

  // ─── WINDOW 2 (Step 02 - Sits over Window 1, z-index 20) ───
  // Hidden before 0.28: visibility hidden, translateY 100%
  // Enters: 0.28 -> 0.44 (Rises from 100% below to 0%, tilt 22deg -> 0deg)
  // Holds flat: 0.44 -> 0.64
  // Gets covered by Window 3 starting at 0.64: scales down to 0.95 and dims
  const w2Visibility = useTransform(scrollYProgress, (v) => (v < 0.27 || v > 0.80 ? "hidden" : "visible"));
  const w2RotateX = useTransform(scrollYProgress, [0.28, 0.44], [22, 0]);
  const w2RotateY = useTransform(scrollYProgress, [0.28, 0.44], [-4, 0]);
  const w2TranslateY = useTransform(scrollYProgress, [0.28, 0.44], ["100%", "0%"]);
  const w2Scale = useTransform(scrollYProgress, [0.28, 0.44, 0.64, 0.78], [0.92, 1, 1, 0.95]);
  const w2DimOpacity = useTransform(scrollYProgress, [0.64, 0.78], [0, 0.65]);

  // Window 2 inner micro-animations
  const w2Bubble1Y = useTransform(scrollYProgress, [0.42, 0.52], [16, 0]);
  const w2Bubble1Opacity = useTransform(scrollYProgress, [0.42, 0.50], [0, 1]);
  const w2Bubble2Y = useTransform(scrollYProgress, [0.48, 0.58], [16, 0]);
  const w2Bubble2Opacity = useTransform(scrollYProgress, [0.48, 0.56], [0, 1]);
  const w2CopyX = useTransform(scrollYProgress, [0.42, 0.52], [20, 0]);
  const w2CopyOpacity = useTransform(scrollYProgress, [0.42, 0.50], [0.5, 1]);

  // ─── WINDOW 3 (Step 03 - Sits over Window 2, z-index 30) ───
  // Hidden before 0.62: visibility hidden, translateY 100%
  // Enters: 0.62 -> 0.78 (Rises from 100% below to 0%, tilt 22deg -> 0deg)
  // Holds flat until end: 0.78 -> 1.00
  const w3Visibility = useTransform(scrollYProgress, (v) => (v < 0.61 ? "hidden" : "visible"));
  const w3RotateX = useTransform(scrollYProgress, [0.62, 0.78], [22, 0]);
  const w3RotateY = useTransform(scrollYProgress, [0.62, 0.78], [-4, 0]);
  const w3TranslateY = useTransform(scrollYProgress, [0.62, 0.78], ["100%", "0%"]);
  const w3Scale = useTransform(scrollYProgress, [0.62, 0.78, 1], [0.92, 1, 1]);

  // Window 3 inner micro-animations
  const w3ShieldScale = useTransform(scrollYProgress, [0.76, 0.86], [0.82, 1]);
  const w3BannerY = useTransform(scrollYProgress, [0.78, 0.88], [16, 0]);
  const w3BannerOpacity = useTransform(scrollYProgress, [0.78, 0.86], [0, 1]);
  const w3CopyX = useTransform(scrollYProgress, [0.76, 0.86], [20, 0]);
  const w3CopyOpacity = useTransform(scrollYProgress, [0.76, 0.84], [0.5, 1]);

  // Tab click smooth-scroll to exact HOLD points
  const scrollToStep = (idx) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const scrollDistance = containerRef.current.offsetHeight - window.innerHeight;

    // HOLD centers: Step 1 -> 18%, Step 2 -> 52%, Step 3 -> 85%
    const targetPercentages = [0.18, 0.52, 0.85];
    const targetScroll = containerTop + scrollDistance * targetPercentages[idx];

    window.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  };

  const handleTabKeyDown = (e, idx) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      scrollToStep(idx);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // ACCESSIBILITY / MOBILE FALLBACK (< 900px or prefers-reduced-motion)
  // ══════════════════════════════════════════════════════════════════
  if (shouldReduceMotion || isMobile) {
    return (
      <section
        id="how-it-works"
        className="relative w-full bg-[#0A0A0C] text-white border-b-2 border-zinc-800 py-8 xs:py-10 px-3.5 xs:px-4 sm:px-8 pb-20 sm:pb-12"
      >
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] text-[#E65A1E]">
                  HOW IT WORKS
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#E65A1E]" />
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                From pin drop to payout in{" "}
                <span className="font-serif italic text-[#E65A1E] font-normal text-3xl sm:text-4xl">
                  3 steps.
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2 border border-zinc-800 bg-[#141418] px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-[2px_2px_0px_#000] self-start sm:self-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-300">
                AVERAGE MATCH TIME: &lt; 5 MINS
              </span>
            </div>
          </div>

          {/* Vertical Stack of Windows */}
          <div className="flex flex-col gap-5 sm:gap-6">
            {STEPS_DATA.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4 }}
              >
                <WindowFrame step={step} stepIndex={idx} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // FULL DESKTOP 3D SCROLL-DRIVEN PINNED EXPERIENCE
  // ══════════════════════════════════════════════════════════════════
  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="hiw-track relative w-full bg-[#0A0A0C] text-white border-b-2 border-zinc-800"
      style={{ height: "var(--hiw-length, 500vh)" }}
    >
      {/* 
        Sticky Stage Viewport (Pinned at top: 0 with exact 100svh height)
        Holds strictly in place via CSS position: sticky while the 500vh track scrolls.
      */}
      <div className="hiw-stage sticky top-0 h-[100svh] max-h-screen w-full flex flex-col justify-between overflow-hidden px-4 sm:px-8 lg:px-14 pt-4 sm:pt-6 pb-4 sm:pb-6 z-20">
        
        {/* 1. Top Header Row */}
        <div className="mx-auto w-full max-w-5xl flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 shrink-0 z-40">
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

        {/* 
          2. Middle Center Stage:
          flex-1, min-h-0, relative, overflow-hidden with perspective: 1600px.
          Windows are stacked inside with ascending z-index and stage-clipped boundaries.
        */}
        <div className="hiw-window-area mx-auto w-full max-w-5xl flex-1 min-h-0 relative flex items-center justify-center overflow-hidden my-auto py-2 [perspective:1600px]">
          
          {/* ═══════════ WINDOW 1 (Z-INDEX 10, Bottom of Stack) ═══════════ */}
          <motion.div
            style={{
              rotateX: w1RotateX,
              rotateY: w1RotateY,
              scale: w1Scale,
              y: w1TranslateY,
              visibility: w1Visibility,
              transformStyle: "preserve-3d",
              willChange: "transform",
              pointerEvents: activeStep === 0 ? "auto" : "none",
            }}
            className="absolute inset-0 m-auto w-full h-full flex items-center justify-center z-10"
          >
            <WindowFrame
              step={STEPS_DATA[0]}
              stepIndex={0}
              dimOverlayOpacity={w1DimOpacity}
              innerAnimations={{
                radarStyle: { scale: w1RadarScale, opacity: w1RadarOpacity },
                copyStyle: { x: w1CopyX, opacity: w1CopyOpacity },
              }}
            />
          </motion.div>

          {/* ═══════════ WINDOW 2 (Z-INDEX 20, Rises over Window 1) ═══════════ */}
          <motion.div
            style={{
              rotateX: w2RotateX,
              rotateY: w2RotateY,
              scale: w2Scale,
              y: w2TranslateY,
              visibility: w2Visibility,
              transformStyle: "preserve-3d",
              willChange: "transform",
              pointerEvents: activeStep === 1 ? "auto" : "none",
            }}
            className="absolute inset-0 m-auto w-full h-full flex items-center justify-center z-20"
          >
            <WindowFrame
              step={STEPS_DATA[1]}
              stepIndex={1}
              dimOverlayOpacity={w2DimOpacity}
              innerAnimations={{
                bubble1Style: { y: w2Bubble1Y, opacity: w2Bubble1Opacity },
                bubble2Style: { y: w2Bubble2Y, opacity: w2Bubble2Opacity },
                copyStyle: { x: w2CopyX, opacity: w2CopyOpacity },
              }}
            />
          </motion.div>

          {/* ═══════════ WINDOW 3 (Z-INDEX 30, Rises over Window 2) ═══════════ */}
          <motion.div
            style={{
              rotateX: w3RotateX,
              rotateY: w3RotateY,
              scale: w3Scale,
              y: w3TranslateY,
              visibility: w3Visibility,
              transformStyle: "preserve-3d",
              willChange: "transform",
              pointerEvents: activeStep === 2 ? "auto" : "none",
            }}
            className="absolute inset-0 m-auto w-full h-full flex items-center justify-center z-30"
          >
            <WindowFrame
              step={STEPS_DATA[2]}
              stepIndex={2}
              innerAnimations={{
                shieldStyle: { scale: w3ShieldScale },
                bannerStyle: { y: w3BannerY, opacity: w3BannerOpacity },
                copyStyle: { x: w3CopyX, opacity: w3CopyOpacity },
              }}
            />
          </motion.div>

        </div>

        {/* 3. Bottom Progress Bar & Interactive Step Tabs */}
        <div className="mx-auto w-full max-w-4xl shrink-0 z-40 pt-1 pb-1">
          {/* Continuous Orange Progress Bar */}
          <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden mb-2.5">
            <motion.div
              style={{ width: overallProgressWidth }}
              className="h-full bg-gradient-to-r from-[#E65A1E] via-amber-500 to-[#E65A1E]"
            />
          </div>

          {/* 3 Interactive Tab Cards */}
          <div
            role="tablist"
            aria-label="How it works steps"
            className="grid grid-cols-3 gap-2 sm:gap-3"
          >
            {STEPS_DATA.map((s, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={s.num}
                  type="button"
                  role="tab"
                  id={`step-tab-${s.num}`}
                  aria-selected={isActive}
                  aria-controls={`step-window-${s.num}`}
                  tabIndex={0}
                  onClick={() => scrollToStep(idx)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`text-left p-2 sm:p-2.5 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                    isActive
                      ? "border-[#E65A1E] bg-[#1A1A20] shadow-[0_8px_20px_-4px_rgba(230,90,30,0.35)] scale-[1.02]"
                      : "border-zinc-800 bg-[#0E0E12] opacity-60 hover:opacity-90 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-black transition-colors ${
                        isActive ? "text-[#E65A1E]" : "text-zinc-500"
                      }`}
                    >
                      {s.num}
                    </span>
                    <span
                      className={`text-[9px] font-bold tracking-wider hidden sm:inline px-1.5 py-0.5 rounded transition-colors ${
                        isActive
                          ? "bg-[#E65A1E]/20 text-[#E65A1E] border border-[#E65A1E]/30"
                          : "text-zinc-500"
                      }`}
                    >
                      {s.tag}
                    </span>
                  </div>

                  <p
                    className={`mt-0.5 text-xs sm:text-sm font-black truncate leading-tight transition-colors ${
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
