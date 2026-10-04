import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Loader2, Sparkles, Coins, CheckCircle2, AlertCircle,
  Briefcase, IndianRupee, MapPin, Building2, ExternalLink
} from "lucide-react";
import { apiPut } from "@/lib/api";
import { updateCustomJob, calculateHopsForJob } from "@/lib/clientStore";
import { CATALOG_CATEGORY_NAMES } from "@/lib/catalogFilters";
import { BENGALURU_AREAS } from "@/lib/locationAreas";
import { sanitizeInput, checkSpamKeywords } from "@/lib/security";

const POPULAR_AREAS = [
  "Koramangala", "Indiranagar", "HSR Layout", "Whitefield",
  "Jayanagar", "Frazer Town", "MG Road", "Electronic City",
  "Bellandur", "BTM Layout", "Marathahalli", "Hebbal",
  "JP Nagar", "Malleshwaram", "Rajajinagar", "Domlur"
];

export default function EditJobModal({ isOpen, onClose, job, onSuccess }) {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [pay, setPay] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Graphics & Design");
  const [area, setArea] = useState("Koramangala");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Pre-fill fields whenever the job changes or modal opens
  useEffect(() => {
    if (job) {
      setTitle(job.title || "");
      setPay(job.pay !== undefined ? String(job.pay) : "5000");
      setDescription(job.description || "");
      setCategory(job.category || job.bucket || "Graphics & Design");
      setArea(job.area || "Koramangala");
      setCompanyName(job.company_name || job.company || "");
      setError("");
      setSuccess(false);
    }
  }, [job, isOpen]);

  if (!isOpen || !job) return null;

  const numPay = parseInt(pay, 10) || 0;
  const hopsRequired = calculateHopsForJob(numPay);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    const cleanTitle = sanitizeInput(title);
    const cleanDesc = sanitizeInput(description);
    const cleanCompany = sanitizeInput(companyName);
    const cleanArea = sanitizeInput(area);

    if (!cleanTitle.trim()) {
      return setError("Please provide a job title.");
    }
    if (numPay < 500) {
      return setError("Minimum pay budget must be at least ₹500.");
    }
    if (!cleanDesc.trim()) {
      return setError("Please provide a job description.");
    }

    // Safety & spam scan
    const spamCheck = checkSpamKeywords(`${cleanTitle} ${cleanDesc} ${cleanCompany}`);
    if (spamCheck.isSpam) {
      return setError(`Safety alert: Job description contains flagged content (${spamCheck.matched.join(", ")}). Please remove before saving.`);
    }

    setSaving(true);
    try {
      const payload = {
        title: cleanTitle.trim(),
        pay: numPay,
        description: cleanDesc.trim(),
        category,
        bucket: category,
        area: cleanArea || "Bengaluru",
        company_name: cleanCompany || "Company",
      };

      // 1. Remote API call (fallback-safe in api.js)
      let updatedJobData = null;
      try {
        updatedJobData = await apiPut(`/employer/jobs/${job.id}`, payload);
      } catch (apiErr) {
        console.warn("Remote API update failed, falling back to local store", apiErr);
      }

      // 2. Client store sync
      const localUpdated = updateCustomJob(job.id, payload);
      const finalJob = updatedJobData || localUpdated;

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(finalJob);
        onClose?.();
      }, 500);
    } catch (err) {
      setError(err?.message || "Could not update the job listing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="edit-job-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="edit-job-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#151517] text-ink dark:text-white shadow-[6px_6px_0px_#121212] dark:shadow-[6px_6px_0px_#000] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink dark:border-zinc-800 bg-sand/70 dark:bg-zinc-900 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-brand text-white font-black">
              <Briefcase size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-ink dark:text-white uppercase">
                Edit Job Listing
              </h2>
              <p className="text-[10px] sm:text-[11px] font-semibold text-inkmuted dark:text-zinc-400">
                Update salary budget, description, category, and gig details
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="edit-job-modal-close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-800 text-ink dark:text-white hover:bg-brand hover:text-white transition"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div
              data-testid="edit-job-error"
              className="flex items-center gap-2 border-2 border-red-500 bg-red-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-red-700 dark:text-red-300"
            >
              <AlertCircle size={15} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              data-testid="edit-job-success"
              className="flex items-center gap-2 border-2 border-ok bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2 size={15} className="shrink-0 text-ok" />
              <span>Job listing updated successfully! Refreshing dashboard…</span>
            </div>
          )}

          {/* 1. Job Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                Job Title <span className="text-brand">*</span>
              </label>
              <span className="text-[10px] font-semibold text-inkmuted dark:text-zinc-400">
                {title.length}/120
              </span>
            </div>
            <input
              type="text"
              data-testid="edit-job-title-input"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AutoCAD 3D Drafter for Residential Villa"
              className="w-full border-2 border-ink dark:border-zinc-700 bg-sand/20 dark:bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-ink dark:text-white placeholder:text-inkmuted dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-800"
              required
            />
          </div>

          {/* 2. Salary / Budget & Hops Calculator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-ink dark:text-white mb-1">
                Budget / Salary (₹ INR) <span className="text-brand">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-inkmuted dark:text-zinc-400">
                  ₹
                </span>
                <input
                  type="number"
                  data-testid="edit-job-pay-input"
                  min={500}
                  step={100}
                  value={pay}
                  onChange={(e) => setPay(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full border-2 border-ink dark:border-zinc-700 bg-sand/20 dark:bg-zinc-900 pl-7 pr-3 py-2.5 text-xs sm:text-sm font-black text-ink dark:text-white placeholder:text-inkmuted dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-800"
                  required
                />
              </div>
              <p className="mt-1 text-[10px] text-inkmuted dark:text-zinc-400">
                Minimum ₹500 fixed pay. Direct 0% fee client payout.
              </p>
            </div>

            {/* Live Hops Calculation Box */}
            <div className="border-2 border-ink dark:border-zinc-700 bg-[#FFF3C4] dark:bg-amber-950/30 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-amber-300 flex items-center gap-1">
                  <Coins size={12} className="text-brand" /> Freelancer Application Cost
                </span>
                <span className="border border-brand bg-brand px-1.5 py-0.2 text-[9px] font-black text-white">
                  {hopsRequired} HOPS
                </span>
              </div>
              <p className="text-[11px] font-bold text-ink dark:text-zinc-200 mt-1">
                Applicants spend <strong>{hopsRequired} Hops</strong> (₹{hopsRequired * 15}) to submit proposals for ₹{numPay.toLocaleString("en-IN")}.
              </p>
            </div>
          </div>

          {/* 3. Category & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-ink dark:text-white mb-1">
                Discipline / Category
              </label>
              <select
                data-testid="edit-job-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border-2 border-ink dark:border-zinc-700 bg-sand/20 dark:bg-zinc-900 px-3 py-2.5 text-xs font-bold text-ink dark:text-white focus:outline-none focus:bg-white dark:focus:bg-zinc-800 cursor-pointer"
              >
                {CATALOG_CATEGORY_NAMES.map((cat) => (
                  <option key={cat} value={cat} className="text-black">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-ink dark:text-white mb-1">
                Bengaluru Locality / Area
              </label>
              <select
                data-testid="edit-job-area-select"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full border-2 border-ink dark:border-zinc-700 bg-sand/20 dark:bg-zinc-900 px-3 py-2.5 text-xs font-bold text-ink dark:text-white focus:outline-none focus:bg-white dark:focus:bg-zinc-800 cursor-pointer"
              >
                {POPULAR_AREAS.map((a) => (
                  <option key={a} value={a} className="text-black">
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Company / Business Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-ink dark:text-white mb-1">
              Company / Hirer Display Name
            </label>
            <input
              type="text"
              data-testid="edit-job-company-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Tech Studio, Indiranagar"
              className="w-full border-2 border-ink dark:border-zinc-700 bg-sand/20 dark:bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-ink dark:text-white placeholder:text-inkmuted dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-800"
            />
          </div>

          {/* 5. Job Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black uppercase tracking-wider text-ink dark:text-white">
                Detailed Gig Description <span className="text-brand">*</span>
              </label>
              <span className="text-[10px] font-semibold text-inkmuted dark:text-zinc-400">
                {description.length}/1200
              </span>
            </div>
            <textarea
              rows={5}
              data-testid="edit-job-description-input"
              value={description}
              maxLength={1200}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe deliverables, required skills, timeline milestones, and reference samples..."
              className="w-full border-2 border-ink dark:border-zinc-700 bg-sand/20 dark:bg-zinc-900 p-3 text-xs sm:text-sm font-medium text-ink dark:text-white placeholder:text-inkmuted dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 resize-none leading-relaxed"
              required
            />
            <p className="mt-1 text-[10px] text-inkmuted dark:text-zinc-400">
              Clear scope and deliverables help matched local pros send accurate bids faster.
            </p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t-2 border-ink dark:border-zinc-800 bg-sand/40 dark:bg-zinc-900 px-5 py-3.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              nav(`/employer/edit-job/${job.id}`, { state: { job } });
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
          >
            <ExternalLink size={12} />
            <span>Open Full Page Editor</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-initial border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-black uppercase text-ink dark:text-white hover:bg-sand dark:hover:bg-zinc-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="edit-job-save-btn"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border-2 border-ink dark:border-zinc-700 bg-brand hover:bg-black dark:hover:bg-brand/90 px-5 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212] transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
