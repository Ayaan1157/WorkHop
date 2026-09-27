import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, X, ArrowRight, MapPin, Building2, Flame } from "lucide-react";
import { markNotificationRead, getStoredNotifications } from "@/lib/clientStore";

function playBlastChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Graceful fallback if audio is autoplay-blocked
  }
}

export default function FeaturedBlastToast() {
  const nav = useNavigate();
  const [activeBlast, setActiveBlast] = useState(null);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const animRef = useRef(null);

  const showBlast = (blastData) => {
    if (!blastData) return;
    setActiveBlast(blastData);
    setProgress(100);
    playBlastChime();

    if (timerRef.current) clearTimeout(timerRef.current);
    if (animRef.current) clearInterval(animRef.current);

    const DURATION = 10000; // 10s
    const start = Date.now();

    animRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const rem = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(rem);
      if (rem <= 0) {
        clearInterval(animRef.current);
      }
    }, 100);

    timerRef.current = setTimeout(() => {
      setActiveBlast(null);
    }, DURATION);
  };

  useEffect(() => {
    // 1. Direct window custom event
    const handleCustomEvent = (e) => {
      if (e?.detail) showBlast(e.detail);
    };
    window.addEventListener("workhop:featured_blast", handleCustomEvent);

    // 2. Cross-tab BroadcastChannel
    let channel;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("workhop_featured_blast");
        channel.onmessage = (e) => {
          if (e?.data) showBlast(e.data);
        };
      }
    } catch {}

    // 3. LocalStorage storage event fallback across tabs/windows
    const handleStorage = (e) => {
      if (e.key === "workhop_last_featured_blast" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          showBlast(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("workhop:featured_blast", handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  if (!activeBlast) return null;

  const handleApply = () => {
    if (activeBlast.id) {
      markNotificationRead(activeBlast.id);
    }
    const targetUrl = activeBlast.to || `/freelancer/jobs?q=${encodeURIComponent(activeBlast.title || "")}&featured=1`;
    setActiveBlast(null);
    nav(targetUrl);
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animRef.current) clearInterval(animRef.current);
    setActiveBlast(null);
  };

  const payFormatted = activeBlast.pay ? `₹${Number(activeBlast.pay).toLocaleString("en-IN")}` : "Competitive Fixed Pay";

  return (
    <div
      data-testid="featured-blast-toast"
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-[99999] w-auto sm:w-[420px] animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className="relative overflow-hidden border-2 border-ink bg-white dark:bg-[#161618] text-ink dark:text-white shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#333]">
        {/* Banner Header */}
        <div className="flex items-center justify-between border-b-2 border-ink bg-brand px-3 py-1.5 text-white">
          <div className="flex items-center gap-1.5 font-black text-[11px] tracking-wider uppercase">
            <Zap size={14} className="fill-white text-white animate-bounce" />
            <span>5KM RADAR BLAST · FEATURED GIG</span>
          </div>
          <button
            onClick={handleDismiss}
            data-testid="featured-blast-dismiss"
            className="flex h-5 w-5 items-center justify-center border border-white/60 bg-black/20 hover:bg-black/40 text-white transition active:translate-y-0.5"
            title="Dismiss notification"
          >
            <X size={12} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-black text-sm text-ink dark:text-white line-clamp-1 leading-snug">
                {activeBlast.title}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs font-bold text-inkmuted dark:text-stone-300 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Building2 size={12} className="text-brand shrink-0" />
                  <span className="font-extrabold text-ink dark:text-white">{activeBlast.company_name}</span>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-ok shrink-0" />
                  <span>{activeBlast.area}</span>
                </span>
              </div>
            </div>
            <span className="shrink-0 border border-ink bg-[#FFF3C4] dark:bg-stone-800 px-2 py-1 text-xs font-black text-ink dark:text-amber-300 shadow-[1px_1px_0px_#121212]">
              {payFormatted}
            </span>
          </div>

          <div className="flex items-center justify-between rounded bg-[#FFF9F3] dark:bg-[#1f1712] border border-brand/30 px-2.5 py-1 text-[11px] font-bold text-brand">
            <span className="flex items-center gap-1">
              <span>⚡ Proximity:</span>
              <strong className="underline decoration-brand decoration-2 underline-offset-2">
                {activeBlast.distance_km != null ? `${activeBlast.distance_km}km from you` : "Within 5km radius"}
              </strong>
            </span>
            <span className="text-[10px] font-black text-inkmuted dark:text-stone-400 uppercase">
              Blast sent to {activeBlast.nearby_freelancers_count || 12}+ Pros
            </span>
          </div>

          {/* Action Row */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <button
              onClick={handleApply}
              data-testid="featured-blast-cta"
              className="flex-1 inline-flex items-center justify-center gap-1.5 border-2 border-ink bg-brand px-3 py-2 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] hover:bg-black transition active:translate-y-0.5"
            >
              <span>VIEW GIG & APPLY NOW</span>
              <ArrowRight size={13} strokeWidth={3} />
            </button>
            <button
              onClick={handleDismiss}
              className="px-2 py-2 text-xs font-bold text-inkmuted hover:text-ink dark:hover:text-white"
            >
              Later
            </button>
          </div>
        </div>

        {/* Progress Countdown Bar */}
        <div className="h-1 w-full bg-sand dark:bg-neutral-800">
          <div
            className="h-full bg-brand transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
