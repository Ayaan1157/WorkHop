// WorkHop High-Fidelity Notification Sound Engine
// Uses Web Audio API synthesis with automatic gesture unlocking and HTML5 audio fallback.

let audioCtx = null;

// Cross-browser AudioContext singleton
export function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioCtxClass();
  }
  return audioCtx;
}

// Unlock Web Audio on first user interaction so sounds are never blocked by browser autoplay policies
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch {}
  };
  window.addEventListener("click", unlockAudio, { passive: true, capture: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true, capture: true });
  window.addEventListener("keydown", unlockAudio, { passive: true, capture: true });
}

// Check if notification sounds are currently enabled in preferences
export function isSoundEnabled() {
  try {
    const raw = localStorage.getItem("workhop_push_preferences");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.sound === false) return false;
    }
  } catch {}
  return true;
}

// Toggle or set notification sound preference
export function setSoundEnabled(enabled) {
  try {
    const raw = localStorage.getItem("workhop_push_preferences");
    const current = raw ? JSON.parse(raw) : {};
    const updated = { ...current, sound: Boolean(enabled) };
    localStorage.setItem("workhop_push_preferences", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("workhop:push_prefs_changed", { detail: updated }));
    return updated;
  } catch {
    return { sound: Boolean(enabled) };
  }
}

// Helper to synthesize a musical bell tone with natural envelope
function playTone(ctx, freq, startTime, duration, peakVolume) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sine root for clean bell tone
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    // Warm overtone for richness
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = "triangle";
    overtone.frequency.setValueAtTime(freq * 2, startTime);

    // Attack (10ms smooth ramp up to avoid clicks)
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startTime + 0.012);
    // Smooth exponential decay
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    overtoneGain.gain.setValueAtTime(0.001, startTime);
    overtoneGain.gain.exponentialRampToValueAtTime(peakVolume * 0.25, startTime + 0.01);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    overtone.connect(overtoneGain);
    overtoneGain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    overtone.start(startTime);
    overtone.stop(startTime + duration * 0.6);
  } catch (err) {
    console.warn("Could not synthesize tone:", err);
  }
}

/**
 * Play the WorkHop notification sound.
 * Uplifting, crisp, modern 3-tone chime (F5 -> A5 -> C6).
 * 
 * @param {Object} options
 * @param {boolean} [options.force=false] - If true, plays regardless of user preference (e.g. for preview/test)
 * @param {number} [options.volume=0.4] - Master volume (0.0 to 1.0)
 * @param {string} [options.type="chime"] - Sound preset: "chime" | "ping" | "blast"
 */
export async function playNotificationSound({ force = false, volume = 0.45, type = "chime" } = {}) {
  if (typeof window === "undefined") return false;

  // Respect user sound preference unless forced (e.g. test button)
  if (!force && !isSoundEnabled()) {
    return false;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === "blast") {
      // Energetic alert for 5km urgent/featured blasts (D5 -> A5 -> D6)
      playTone(ctx, 587.33, now, 0.22, volume * 0.7);
      playTone(ctx, 880.00, now + 0.08, 0.28, volume * 0.85);
      playTone(ctx, 1174.66, now + 0.16, 0.42, volume * 1.0);
    } else if (type === "ping") {
      // Short subtle ping for chat & quick pings (G5 -> C6)
      playTone(ctx, 783.99, now, 0.18, volume * 0.7);
      playTone(ctx, 1046.50, now + 0.07, 0.35, volume * 0.9);
    } else {
      // Standard signature WorkHop notification chime:
      // Note 1: F5 (698.46 Hz)
      // Note 2: A5 (880.00 Hz)
      // Note 3: C6 (1046.50 Hz)
      playTone(ctx, 698.46, now, 0.24, volume * 0.65);
      playTone(ctx, 880.00, now + 0.08, 0.28, volume * 0.8);
      playTone(ctx, 1046.50, now + 0.16, 0.45, volume * 0.95);
    }

    return true;
  } catch (err) {
    console.warn("Notification sound playback fallback error:", err);
    return false;
  }
}

// Convenient shortcut for testing or previewing the sound in UI
export function previewNotificationSound(type = "chime") {
  return playNotificationSound({ force: true, volume: 0.6, type });
}
