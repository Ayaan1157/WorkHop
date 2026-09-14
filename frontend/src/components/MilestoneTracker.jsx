import React from "react";
import { Check, CircleDot, Clock, ShieldCheck, Sparkles } from "lucide-react";

export const MILESTONES = [
  { id: "posted", label: "Gig Posted", step: 1 },
  { id: "applied", label: "Applied", step: 2 },
  { id: "hired", label: "Hired & Escrow Funded", step: 3 },
  { id: "in_progress", label: "In Progress", step: 4 },
  { id: "delivered", label: "Delivered", step: 5 },
  { id: "completed", label: "Payment Released", step: 6 },
  { id: "reviewed", label: "Reviewed", step: 7 },
];

export default function MilestoneTracker({ currentStatus = "applied", currentStep = 2, className = "" }) {
  // Map textual status to numeric step
  const stepMap = {
    posted: 1,
    applied: 2,
    in_review: 2,
    hired: 3,
    in_progress: 4,
    delivered: 5,
    completed: 6,
    reviewed: 7,
  };

  const activeStep = stepMap[currentStatus] || currentStep || 2;

  return (
    <div
      data-testid="milestone-tracker"
      className={`border-2 border-ink bg-white p-4 shadow-[2px_2px_0px_#121212] ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand" />
          <span className="text-xs font-black tracking-wider text-ink uppercase">
            WorkHop Escrow &amp; Milestone Tracker
          </span>
        </div>
        <span className="border border-ink bg-sand px-2 py-0.5 text-[10px] font-black text-ink uppercase">
          Step {activeStep} of {MILESTONES.length}
        </span>
      </div>

      {/* Responsive Horizontal Stepper */}
      <div className="relative mt-2 flex items-center justify-between overflow-x-auto pb-2">
        {MILESTONES.map((m, idx) => {
          const isDone = m.step < activeStep;
          const isCurrent = m.step === activeStep;
          const isUpcoming = m.step > activeStep;

          return (
            <div key={m.id} className="relative flex flex-1 flex-col items-center text-center min-w-[72px]">
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={`absolute right-1/2 top-4 -z-0 h-1 w-full -translate-y-1/2 transition-colors ${
                    m.step <= activeStep ? "bg-brand" : "bg-ink/15"
                  }`}
                />
              )}

              {/* Step Circle */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center border-2 border-ink text-xs font-black transition ${
                  isDone
                    ? "bg-ok text-white"
                    : isCurrent
                    ? "bg-brand text-white animate-pulse"
                    : "bg-sand text-inkmuted"
                }`}
              >
                {isDone ? <Check size={16} /> : isCurrent ? <CircleDot size={16} /> : m.step}
              </div>

              {/* Label */}
              <span
                className={`mt-1.5 text-[10px] font-black leading-tight ${
                  isCurrent ? "text-brand" : isDone ? "text-ink" : "text-inkmuted"
                }`}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
