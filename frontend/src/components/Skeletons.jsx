import React from "react";

export function JobCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 border-2 border-ink bg-white p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 bg-sand border border-ink/20" />
        <div className="h-4 w-16 bg-sand border border-ink/20" />
      </div>
      <div className="h-6 w-3/4 bg-sand border border-ink/20" />
      <div className="h-4 w-full bg-sand border border-ink/20" />
      <div className="h-4 w-2/3 bg-sand border border-ink/20" />
      <div className="flex gap-2">
        <div className="h-6 w-20 bg-sand border border-ink/20" />
        <div className="h-6 w-20 bg-sand border border-ink/20" />
      </div>
      <div className="my-1 h-px bg-ink/10" />
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-sand border border-ink/20" />
        <div className="h-9 w-24 bg-ink/10 border border-ink/20" />
      </div>
    </div>
  );
}

export function ProCardSkeleton() {
  return (
    <div className="flex flex-col justify-between border-2 border-ink bg-white p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 border-2 border-ink bg-sand" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-sand border border-ink/20" />
          <div className="mt-1 h-4 w-24 bg-sand border border-ink/20" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-16 bg-sand" />
        <div className="h-5 w-20 bg-sand" />
      </div>
      <div className="mt-4 h-9 w-full bg-sand border border-ink/20" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse">
      <div className="flex flex-col items-center gap-3 border-2 border-ink bg-white p-6">
        <div className="h-20 w-20 border-2 border-ink bg-sand" />
        <div className="h-6 w-40 bg-sand" />
        <div className="h-4 w-28 bg-sand" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 border-2 border-ink bg-white" />
        ))}
      </div>
    </div>
  );
}
