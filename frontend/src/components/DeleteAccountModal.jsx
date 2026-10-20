import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2, Loader2, Scale } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DeleteAccountModal({ isOpen, onClose }) {
  const { user, deleteAccount } = useAuth();
  const nav = useNavigate();

  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);
    try {
      await deleteAccount(reason || "User initiated DPDP erasure");
      setDeleted(true);
      setTimeout(() => {
        onClose?.();
        nav("/", { replace: true });
        window.location.reload();
      }, 2000);
    } catch (e) {
      setError(e?.message || "Failed to process account erasure. Please contact grievance@workhop.in");
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="delete-account-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="delete-account-modal"
        className="relative w-full max-w-lg border-3 border-ink bg-white dark:bg-[#161618] text-ink dark:text-white p-6 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#000] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!deleted && (
          <button
            onClick={onClose}
            data-testid="delete-account-modal-close"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center border-2 border-ink bg-sand dark:bg-[#252525] text-ink dark:text-white hover:bg-danger hover:text-white transition"
            title="Close"
          >
            <X size={16} />
          </button>
        )}

        {deleted ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="flex h-14 w-14 items-center justify-center border-2 border-ink bg-green-500 text-white shadow-[3px_3px_0px_#121212]">
              <CheckCircle2 size={32} />
            </div>
            <span className="inline-block bg-ink text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              DPDP ACT, 2023 COMPLIANT ERASURE
            </span>
            <h3 className="text-xl font-black text-ink dark:text-white">
              Account &amp; Data Permanently Deleted
            </h3>
            <p className="text-xs text-inkmuted dark:text-gray-300 max-w-sm">
              Your profile, personal contact details, active sessions, and portfolio data have been permanently erased from WorkHop servers in compliance with Section 12 of India's DPDP Act. Redirecting you to homepage...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Header Badge */}
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-red-100 text-danger shadow-[2px_2px_0px_#121212]">
                <Trash2 size={24} />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 border border-ink bg-danger text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                  <Scale size={11} /> DPDP ACT, 2023 · SECTION 12
                </span>
                <h3 className="text-lg sm:text-xl font-black text-ink dark:text-white uppercase leading-snug mt-1">
                  Right to Erasure (Delete Account)
                </h3>
                <p className="text-[11px] font-semibold text-inkmuted dark:text-gray-400">
                  Permanent data erasure for <span className="font-bold text-ink dark:text-white">{user?.email || "this account"}</span>
                </p>
              </div>
            </div>

            {/* Warning Box */}
            <div className="border-2 border-danger bg-red-50 dark:bg-[#251010] p-3.5 text-xs text-danger dark:text-red-300">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-[13px]">
                <AlertTriangle size={15} /> This action is permanent and cannot be undone.
              </p>
              <p className="text-[11px] leading-relaxed text-ink/80 dark:text-gray-300">
                In strict compliance with India's <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>, exercising this right will irrevocably purge:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-[11px] text-ink/90 dark:text-gray-300 font-medium">
                <li>Your name, email address, and 10-digit mobile phone number</li>
                <li>Your verified skills, bio, portfolio samples, and certifications</li>
                <li>Your radial location coordinates and neighborhood preferences</li>
                <li>Your in-app message history, gig proposals, and lead records</li>
                <li>Active login sessions and web push notification subscriptions</li>
              </ul>
            </div>

            {/* Optional Reason Dropdown */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-gray-400 block mb-1">
                Reason for leaving (Optional)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border-2 border-ink bg-sand dark:bg-[#222] text-ink dark:text-white text-xs px-2.5 py-2 font-medium focus:outline-none"
              >
                <option value="">Select a reason...</option>
                <option value="privacy_concerns">Privacy or data protection preference</option>
                <option value="found_work">Found full-time work outside WorkHop</option>
                <option value="moving_city">Moving away from Bengaluru</option>
                <option value="duplicate_account">Created a duplicate account</option>
                <option value="not_needed">No longer require freelance or hiring services</option>
                <option value="other">Other reason</option>
              </select>
            </div>

            {/* Confirmation Input */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-ink dark:text-white block mb-1">
                Type <span className="font-mono text-danger font-black">DELETE</span> to confirm permanent erasure:
              </label>
              <input
                data-testid="delete-account-confirm-input"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full border-2 border-ink bg-white dark:bg-[#1a1a1a] text-ink dark:text-white font-mono font-bold text-sm px-3 py-2.5 uppercase focus:outline-none focus:border-danger"
              />
            </div>

            {error && (
              <p className="text-xs font-bold text-danger border border-danger p-2 bg-red-50">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-ink/10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 border-2 border-ink bg-sand dark:bg-[#252525] text-ink dark:text-white py-2.5 text-xs font-black tracking-wider uppercase hover:bg-gray-200 transition"
              >
                CANCEL &amp; KEEP ACCOUNT
              </button>
              <button
                type="button"
                data-testid="delete-account-confirm-btn"
                disabled={!isConfirmed || loading}
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-1.5 border-2 border-ink bg-danger text-white py-2.5 text-xs font-black tracking-wider uppercase shadow-[2px_2px_0px_#121212] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 transition"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>ERASING DATA...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>PERMANENTLY DELETE</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-center text-inkmuted dark:text-gray-400">
              Governed under Section 12 of the Digital Personal Data Protection Act, 2023 🇮🇳
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
