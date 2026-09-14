import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, ArrowRight } from "lucide-react";
import { getProfileCompletion } from "@/lib/clientStore";

export default function ProfileProgressBar({ user, role = "freelancer", className = "" }) {
  const [expanded, setExpanded] = useState(false);
  const { percentage, checks } = getProfileCompletion(user);

  return (
    <div
      data-testid="profile-progress-widget"
      className={`border-2 border-ink bg-sand p-4 shadow-[2px_2px_0px_#121212] transition ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-brand text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-ink uppercase">
                {role === "employer" ? "Company Profile" : "Pro Profile Readiness"}
              </span>
              <span className="bg-ink px-2 py-0.5 text-[10px] font-black text-white">
                {percentage}% COMPLETE
              </span>
            </div>
            <p className="text-[11px] text-inkmuted">
              {percentage >= 100
                ? "Your profile is 100% verified and prioritized in 5km searches."
                : "Complete remaining items to boost discovery by 2.4x in your area."}
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white hover:bg-sand transition"
          title="Toggle checklist"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Progress Bar Track */}
      <div className="mt-3 h-2.5 w-full border-2 border-ink bg-white">
        <div
          className="h-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Expandable Actionable Checklist */}
      {expanded && (
        <div className="mt-4 flex flex-col gap-2 border-t-2 border-ink/15 pt-3">
          {checks.map((item) => (
            <div
              key={item.key}
              className={`flex items-center justify-between border border-ink p-2 ${
                item.completed ? "bg-white" : "bg-[#FFF9F3]"
              }`}
            >
              <div className="flex items-center gap-2">
                {item.completed ? (
                  <CheckCircle2 size={16} className="text-ok" />
                ) : (
                  <Circle size={16} className="text-brand" />
                )}
                <span
                  className={`text-xs font-bold ${
                    item.completed ? "line-through text-inkmuted" : "text-ink"
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {!item.completed && (
                <Link
                  to={role === "employer" ? "/profile" : "/freelancer"}
                  className="flex items-center gap-1 bg-ink px-2 py-1 text-[10px] font-black text-white hover:bg-brand transition"
                >
                  <span>ADD NOW</span>
                  <ArrowRight size={10} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
