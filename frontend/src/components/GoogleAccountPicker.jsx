import { useState } from "react";
import { User, Mail, Plus, Check, X, ShieldCheck, ArrowRight } from "lucide-react";

// Default preset Google accounts for realistic one-click sign in
const DEFAULT_SAVED_ACCOUNTS = [
  {
    id: "acc-1",
    name: "Ayaan S.",
    email: "ayaan1157@gmail.com",
    avatarBg: "#E65A1E",
    initials: "AS",
  },
  {
    id: "acc-2",
    name: "Zenith Developer",
    email: "zenithdeveleoperss@gmail.com",
    avatarBg: "#121212",
    initials: "ZD",
  },
  {
    id: "acc-3",
    name: "Manara Studio",
    email: "manarastudio22@gmail.com",
    avatarBg: "#2563EB",
    initials: "MS",
  },
];

export default function GoogleAccountPicker({
  isOpen,
  onClose,
  onSelectAccount,
  currentEmail = "",
}) {
  const [useAnother, setUseAnother] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [customError, setCustomError] = useState("");

  if (!isOpen) return null;

  const handleChoose = (account) => {
    onSelectAccount(account);
    onClose();
  };

  const handleCustomSubmit = (e) => {
    e?.preventDefault();
    setCustomError("");
    const trimmedEmail = customEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setCustomError("Please enter a valid Google email address.");
      return;
    }
    const derivedName = customName.trim() || trimmedEmail.split("@")[0].replace(/[._]/g, " ");
    const initials = derivedName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const customAccount = {
      id: `custom-${Date.now()}`,
      name: derivedName,
      email: trimmedEmail,
      avatarBg: "#4285F4",
      initials: initials || "G",
    };

    onSelectAccount(customAccount);
    onClose();
  };

  return (
    <div
      data-testid="google-account-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-[440px] border-2 border-ink bg-white p-6 shadow-[8px_8px_0px_#121212] font-sans text-ink">
        
        {/* Close Button */}
        <button
          data-testid="close-google-picker-btn"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border-2 border-ink bg-white text-ink hover:bg-sand transition active:translate-y-0.5"
          title="Cancel"
        >
          <X size={18} />
        </button>

        {/* Google Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <svg className="h-9 w-9" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>

          <h3 className="mt-3 text-xl font-black tracking-tight text-ink">
            Choose an account
          </h3>
          <p className="mt-1 text-xs text-inkmuted">
            to continue to <strong className="text-ink font-extrabold">WorkHop (workhop.in)</strong>
          </p>
        </div>

        {/* Account List */}
        {!useAnother ? (
          <div className="mt-6 flex flex-col gap-2">
            {DEFAULT_SAVED_ACCOUNTS.map((acc) => {
              const isCurrent = currentEmail && currentEmail.toLowerCase() === acc.email.toLowerCase();
              return (
                <button
                  key={acc.id}
                  data-testid={`google-acc-${acc.id}`}
                  onClick={() => handleChoose(acc)}
                  className={`flex w-full items-center justify-between border-2 border-ink p-3 text-left transition hover:translate-x-0.5 ${
                    isCurrent
                      ? "bg-[#FFF3E9] shadow-[3px_3px_0px_#E65A1E]"
                      : "bg-white shadow-[2px_2px_0px_#121212] hover:bg-sand"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      style={{ backgroundColor: acc.avatarBg }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink font-mono text-xs font-black text-white shadow-[1px_1px_0px_#121212]"
                    >
                      {acc.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-black text-ink">
                        {acc.name}
                      </span>
                      <span className="truncate text-xs font-bold text-inkmuted">
                        {acc.email}
                      </span>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="border border-ink bg-brand px-1.5 py-0.5 text-[9px] font-black text-white uppercase">
                      Selected
                    </span>
                  ) : (
                    <ChevronRight className="text-inkmuted" size={16} />
                  )}
                </button>
              );
            })}

            {/* Use Another Account Button */}
            <button
              data-testid="google-use-another-btn"
              onClick={() => setUseAnother(true)}
              className="mt-1 flex w-full items-center gap-3 border-2 border-dashed border-ink bg-sand/60 p-3 text-left font-black text-xs text-ink hover:bg-sand transition"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink bg-white">
                <Plus size={16} className="text-ink" />
              </div>
              <div className="flex flex-col">
                <span>Use another Google account</span>
                <span className="text-[10px] font-normal text-inkmuted">
                  Enter any custom Google / Gmail email
                </span>
              </div>
            </button>
          </div>
        ) : (
          /* Custom Google Account Entry Form */
          <form onSubmit={handleCustomSubmit} className="mt-5 flex flex-col gap-3">
            <div className="border-b-2 border-ink pb-2 mb-1 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-ink">
                Enter Your Google Account
              </span>
              <button
                type="button"
                onClick={() => setUseAnother(false)}
                className="text-[11px] font-bold text-brand underline"
              >
                ← Back to saved
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                Google Email Address *
              </label>
              <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2 shadow-[2px_2px_0px_#121212]">
                <Mail size={15} className="text-inkmuted mr-2 shrink-0" />
                <input
                  data-testid="google-custom-email-input"
                  type="email"
                  required
                  placeholder="your.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-ink outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-inkmuted">
                Display Name (Optional)
              </label>
              <div className="mt-1 flex items-center border-2 border-ink bg-white px-3 py-2 shadow-[2px_2px_0px_#121212]">
                <User size={15} className="text-inkmuted mr-2 shrink-0" />
                <input
                  data-testid="google-custom-name-input"
                  type="text"
                  placeholder="e.g. Ayaan Sharma"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-ink outline-none"
                />
              </div>
            </div>

            {customError && (
              <p className="text-[11px] font-black text-red-600 bg-red-50 p-2 border border-red-200">
                ⚠️ {customError}
              </p>
            )}

            <button
              type="submit"
              data-testid="google-custom-submit-btn"
              className="mt-2 flex w-full items-center justify-center gap-1.5 border-2 border-ink bg-brand py-2.5 text-xs font-black tracking-wider text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <span>Continue with this account</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* Security / Privacy Footnote */}
        <div className="mt-6 border-t border-ink/15 pt-4 text-center text-[10px] text-inkmuted leading-relaxed">
          <p>
            To continue, Google will share your name, email address, language preference, and profile picture with WorkHop.
          </p>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] font-bold text-ink">
            <a href="/legal" target="_blank" rel="noreferrer" className="hover:underline">
              Privacy Policy
            </a>
            <span>·</span>
            <a href="/legal" target="_blank" rel="noreferrer" className="hover:underline">
              Terms of Service
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function ChevronRight({ className = "", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
