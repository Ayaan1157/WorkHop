import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, Home, Briefcase, Users, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const nav = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-sand text-ink selection:bg-brand selection:text-white">
      {/* Top Banner */}
      <header className="border-b-2 border-ink bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-black text-xl tracking-tight">
            <span className="bg-brand px-2 py-0.5 text-white border-2 border-ink shadow-[2px_2px_0px_#121212]">
              WORKHOP
            </span>
            <span className="text-xs font-bold text-inkmuted uppercase tracking-wider hidden sm:inline">
              Hyperlocal Bengaluru
            </span>
          </Link>
          <button
            onClick={() => nav(-1)}
            className="flex items-center gap-1.5 border-2 border-ink bg-sand px-3 py-1.5 text-xs font-black uppercase text-ink hover:bg-white transition shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </header>

      {/* Main 404 Hero */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg border-3 border-ink bg-white p-8 text-center shadow-[6px_6px_0px_#121212] sm:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-2 border-ink bg-[#FFF3C4] text-brand shadow-[3px_3px_0px_#121212]">
            <Compass size={32} className="animate-spin-slow" />
          </div>

          <div className="mb-2 inline-block border-2 border-ink bg-brand px-3 py-1 text-xs font-black uppercase tracking-widest text-white shadow-[2px_2px_0px_#121212]">
            404 · Page Not Found
          </div>

          <h1 className="mt-2 text-2xl font-black uppercase text-ink sm:text-3xl">
            You've Hopped Outside The Radar
          </h1>

          <p className="mt-2 text-sm font-semibold text-inkmuted">
            The page or gig you were looking for doesn't exist, has expired, or has moved to a new URL within the 5 km radius.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/freelancer/jobs"
              className="flex items-center justify-center gap-2 border-2 border-ink bg-brand px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_#121212] transition hover:bg-black active:translate-y-0.5"
            >
              <Briefcase size={14} /> Browse Gigs
            </Link>

            <Link
              to="/employer"
              className="flex items-center justify-center gap-2 border-2 border-ink bg-[#FFF3C4] px-5 py-3 text-xs font-black uppercase tracking-wider text-ink shadow-[3px_3px_0px_#121212] transition hover:bg-[#FFEAA0] active:translate-y-0.5"
            >
              <Users size={14} /> Explore Pros
            </Link>

            <Link
              to="/"
              className="flex items-center justify-center gap-2 border-2 border-ink bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-ink shadow-[3px_3px_0px_#121212] transition hover:bg-sand active:translate-y-0.5"
            >
              <Home size={14} /> Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="border-t-2 border-ink bg-white py-4 text-center text-xs font-bold text-inkmuted">
        WorkHop Bengaluru · Connecting Verified Pros & Employers within 5 km · <Link to="/support" className="text-brand underline">Support</Link>
      </footer>
    </div>
  );
}
