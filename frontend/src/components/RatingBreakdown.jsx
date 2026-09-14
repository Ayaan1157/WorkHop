import React from "react";
import { Star } from "lucide-react";

export default function RatingBreakdown({ rating = 4.9, totalReviews = 24, className = "" }) {
  // Generate realistic distribution percentages
  const distribution = [
    { stars: 5, percentage: 88, count: Math.round(totalReviews * 0.88) },
    { stars: 4, percentage: 9, count: Math.max(1, Math.round(totalReviews * 0.09)) },
    { stars: 3, percentage: 3, count: Math.max(0, Math.round(totalReviews * 0.03)) },
    { stars: 2, percentage: 0, count: 0 },
    { stars: 1, percentage: 0, count: 0 },
  ];

  return (
    <div
      data-testid="rating-breakdown-widget"
      className={`border-2 border-ink bg-white p-4 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-6">
        {/* Big Overall Rating Score */}
        <div className="flex flex-col items-center justify-center border-2 border-ink bg-sand p-4 min-w-[120px]">
          <span className="text-4xl font-black text-ink">{rating}</span>
          <div className="my-1 flex text-brand">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={14} fill="#E65A1E" className="text-brand" />
            ))}
          </div>
          <span className="text-[10px] font-bold text-inkmuted">{totalReviews} Verified Reviews</span>
        </div>

        {/* 5-Star Breakdown Bar Chart */}
        <div className="flex flex-1 flex-col gap-1.5 min-w-[200px]">
          {distribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-2 text-xs">
              <span className="w-6 font-bold text-ink text-right">{d.stars}★</span>
              <div className="h-3 flex-1 border border-ink bg-sand overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-500"
                  style={{ width: `${d.percentage}%` }}
                />
              </div>
              <span className="w-8 text-[11px] font-semibold text-inkmuted text-right">
                {d.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
