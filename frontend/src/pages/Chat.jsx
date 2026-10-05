import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Send, ShieldCheck, Star, Loader2, CheckCheck,
  Search, Paperclip, X, Image as ImageIcon, FileText, Sparkles, MapPin,
  Lock, Unlock, Phone, CheckCircle2
} from "lucide-react";
import DealTracker from "@/components/DealTracker";
import { getDistanceSuitability } from "@/lib/locationAreas";
import { API, apiGet, apiPost } from "@/lib/api";
import { scanText, scanUploadFile, redactViolations } from "@/lib/contactScanner";

export default function Chat() {
  const nav = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const myRole = sp.get("role") === "employer" ? "employer" : "freelancer";

  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [myReviewDone, setMyReviewDone] = useState(false);

  // UX Enhancements
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachment, setAttachment] = useState(null); // { name, type, dataUrl }
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  const [deal, setDeal] = useState(null);
  const [dealEvents, setDealEvents] = useState([]);

  const status = deal?.status || conv?.status || "applied";

  // Check if freelancer is officially hired
  const isHired = Boolean(
    status === "hired" ||
    status === "completed" ||
    conv?.status === "hired" ||
    conv?.status === "completed" ||
    (deal && ["funded", "acknowledged", "in_progress", "submitted", "work_submitted", "work_confirmed", "approved", "completed"].includes(deal.status))
  );

  // Real-time contact detection while typing before hiring
  const contactViolation = useMemo(() => {
    if (isHired || !text.trim()) return null;
    const scan = scanText(text.trim());
    if (scan?.hasViolations) {
      return (
        scan.violations.find((v) => v.type === "phone" || v.type === "social") ||
        scan.violations[0]
      );
    }
    return null;
  }, [text, isHired]);

  // Hire flow states
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [hirePay, setHirePay] = useState(15000);
  const [hireMode, setHireMode] = useState("escrow");
  const [hireBusy, setHireBusy] = useState(false);
  const [hireSuccessBanner, setHireSuccessBanner] = useState(false);

  const loadDeal = useCallback(async () => {
    try {
      const res = await apiGet(`/deals/by-conversation/${id}`);
      if (res?.deal) {
        setDeal(res.deal);
        setDealEvents(res.events || []);
        if (res.deal.agreed_amount_paise) {
          setHirePay(Math.round(res.deal.agreed_amount_paise / 100));
        }
        if (res.deal.payment_mode) {
          setHireMode(res.deal.payment_mode);
        }
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    try {
      setMessages(await apiGet(`/chats/${id}/messages`));
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    apiGet(`/chats/${id}`)
      .then((c) => {
        setConv(c);
        if (c?.pay && !deal) {
          setHirePay(Number(c.pay));
        }
      })
      .catch(() => {});
    loadDeal();
    loadMessages().finally(() => setLoading(false));
    apiGet(`/reviews?conversation_id=${id}`)
      .then((rev) => {
        if ((rev || []).some((x) => x.reviewer_role === myRole)) setMyReviewDone(true);
      })
      .catch(() => {});
    const timer = setInterval(() => {
      loadMessages();
      loadDeal();
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadMessages, loadDeal, myRole]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isTyping]);

  const handleConfirmHire = async () => {
    setHireBusy(true);
    try {
      const payPaise = Math.round(Number(hirePay || 15000) * 100);
      await apiPost(`/chats/${id}/hire`, {
        agreed_amount_paise: payPaise,
        payment_mode: hireMode,
      });
      setConv((prev) => (prev ? { ...prev, status: "hired" } : { status: "hired" }));
      setHireModalOpen(false);
      setHireSuccessBanner(true);
      setTimeout(() => setHireSuccessBanner(false), 8000);
      await loadDeal();
      await loadMessages();
    } catch (err) {
      alert(err?.message || "Failed to complete hire. Please try again.");
    } finally {
      setHireBusy(false);
    }
  };

  const submitReview = async () => {
    if (rating < 1) return;
    setBusy(true);
    try {
      await apiPost("/reviews", {
        conversation_id: id,
        reviewer_role: myRole,
        rating,
        text: reviewText,
      });
      setMyReviewDone(true);
      setReviewOpen(false);
    } catch (e) {
      if (e?.status === 409) {
        setMyReviewDone(true);
        setReviewOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(`Attachment "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Screen attachment for contact info before hiring
    if (!isHired) {
      const scanRes = await scanUploadFile(file);
      if (scanRes?.hasViolations) {
        alert(
          `Attachment blocked: Phone numbers/contact details detected (${scanRes.violations.map((v) => v.label).join(", ")}).\n\nPhone numbers cannot be shared before hiring. Use the "HIRE PRO" button at the top of the chat box to hire first and unlock direct contact sharing.`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "doc",
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !attachment) || sending) return;

    // Contact details enforcement: blocked before hire, allowed once hired
    if (body) {
      const textScan = scanText(body);
      if (textScan?.hasViolations) {
        if (!isHired) {
          alert(
            `🔒 Message blocked: Contact details detected (${textScan.violations.map((v) => v.label).join(", ")}).\n\nBefore hiring, phone numbers and personal contact information cannot be shared in chat.\n\nOnce the employer hires the freelancer using the 'HIRE PRO' button at the top of the chat box, phone numbers and WhatsApp details can be shared freely!`
          );
          return;
        }
        // Once isHired: phone numbers, WhatsApp, and contacts are allowed!
      }
    }

    setSending(true);
    const msgPayload = attachment ? `${body ? body + "\n" : ""}[Attachment: ${attachment.name}]` : body;
    setText("");
    setAttachment(null);
    try {
      const r = await fetch(`${API}/chats/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_role: myRole, text: msgPayload }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages((m) => [...m, msg]);
      } else {
        const errData = await r.json().catch(() => ({}));
        if (errData?.detail) {
          alert(errData.detail);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const otherName = myRole === "freelancer" ? conv?.company_name : conv?.freelancer_name;

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex h-screen w-full flex-col bg-white dark:bg-[#121212] text-ink dark:text-white">
      {/* HEADER WITH ONLINE STATUS & SEARCH */}
      <div
        className="flex items-center gap-3 border-b-2 border-ink dark:border-zinc-800 bg-white dark:bg-[#18181b] px-4 py-3 sm:px-8"
        data-testid="chat-topbar"
      >
        <button
          data-testid="chat-back-btn"
          onClick={() => nav(-1)}
          className="flex h-10 w-10 items-center justify-center border-2 border-ink dark:border-zinc-700 hover:bg-sand dark:hover:bg-zinc-800 dark:text-white transition"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-brand text-base font-black text-white">
            {(otherName || "?").slice(0, 1).toUpperCase()}
          </div>
          {/* ONLINE INDICATOR */}
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-800 bg-ok" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-black text-ink dark:text-white">{otherName || "Chat"}</p>
            <span className="text-[10px] font-bold text-ok flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" /> Active now
            </span>
          </div>
          <p className="truncate text-[11px] text-inkmuted dark:text-zinc-400 font-semibold">{conv?.job_title || ""}</p>
        </div>

        {/* HIRE BUTTON ON TOP OF THE CHAT BOX */}
        {myRole === "employer" && !isHired ? (
          <button
            data-testid="chat-top-hire-btn"
            onClick={() => setHireModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 border-2 border-ink bg-[#E65A1E] hover:bg-black px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-black uppercase text-white shadow-[2.5px_2.5px_0px_#121212] transition active:translate-y-0.5 shrink-0"
            title="Hire freelancer to unlock phone numbers and start gig contract"
          >
            <Sparkles size={15} className="text-white animate-spin" />
            <span>HIRE PRO {hirePay ? `· ₹${Number(hirePay).toLocaleString("en-IN")}` : ""}</span>
          </button>
        ) : isHired ? (
          <div
            data-testid="chat-top-hired-badge"
            className="flex items-center gap-1.5 border-2 border-ink bg-[#E5F8EE] dark:bg-[#153424] px-3 py-1.5 text-xs font-black uppercase text-ok shadow-[2px_2px_0px_#121212] shrink-0"
          >
            <CheckCircle2 size={15} />
            <span>HIRED · PHONE UNLOCKED</span>
          </div>
        ) : (
          <div
            data-testid="chat-top-awaiting-badge"
            className="flex items-center gap-1.5 border-2 border-ink bg-sand dark:bg-zinc-800 px-3 py-1.5 text-[11px] font-black uppercase text-ink dark:text-zinc-200 shadow-[1.5px_1.5px_0px_#121212] shrink-0"
            title="Phone numbers will unlock when employer clicks Hire Pro"
          >
            <Lock size={12} className="text-amber-600" />
            <span className="hidden sm:inline">STEP 1: AWAITING HIRE</span>
            <span className="sm:hidden">AWAITING HIRE</span>
          </div>
        )}

        {/* SEARCH IN CHAT BUTTON */}
        <button
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setSearchQuery("");
          }}
          className={`flex h-10 w-10 items-center justify-center border-2 border-ink dark:border-zinc-700 transition shrink-0 ${
            searchOpen ? "bg-ink text-white dark:bg-white dark:text-black" : "bg-white text-ink hover:bg-sand dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
          }`}
          title="Search in conversation"
        >
          <Search size={16} />
        </button>
      </div>

      {/* SEARCH BAR (COLLAPSIBLE) */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b-2 border-ink dark:border-zinc-800 bg-sand dark:bg-zinc-900 px-4 py-2 animate-in fade-in duration-150">
          <Search size={14} className="text-inkmuted dark:text-zinc-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages in this chat…"
            className="wh-input flex-1 bg-transparent text-xs font-semibold text-ink dark:text-white placeholder:text-inkmuted dark:placeholder:text-zinc-500 outline-none"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[10px] font-extrabold text-inkmuted dark:text-zinc-400">
              {filteredMessages.length} match{filteredMessages.length === 1 ? "" : "es"}
            </span>
          )}
          <button onClick={() => setSearchQuery("")} className="text-inkmuted hover:text-ink dark:text-zinc-400 dark:hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* STATUS & ACTIONS BAR */}
      <div
        className="flex items-center gap-2 border-b-2 border-ink dark:border-zinc-800 bg-sand dark:bg-zinc-900 px-4 py-2 flex-wrap"
        data-testid="chat-status-bar"
      >
        <span
          className={`border border-ink px-3 py-1 text-[10px] font-black tracking-wider text-white ${
            status === "completed" ? "bg-ok" : isHired ? "bg-brand" : "bg-ink"
          }`}
        >
          {status === "completed" ? "COMPLETED" : isHired ? "HIRED" : "APPLIED"}
        </span>

        {/* Contact Protection Indicator */}
        {!isHired ? (
          <div className="flex items-center gap-1.5 border border-amber-500/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-200">
            <Lock size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Phone numbers locked until hired</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 border border-ok/60 bg-[#E5F8EE] dark:bg-[#153424] px-2.5 py-1 text-[10px] font-black text-ok">
            <CheckCircle2 size={11} className="shrink-0" />
            <span>Phone &amp; contact sharing unlocked</span>
          </div>
        )}

        {/* Hyperlocal distance badge */}
        <div className="flex items-center gap-1.5 border border-ink dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-[10px] font-black text-ink dark:text-zinc-100">
          <MapPin size={11} className="text-brand" />
          <span>
            {myRole === "employer"
              ? `Applicant from ${conv?.applicant_area || "Indiranagar"} (${conv?.distance_km ?? 1.4} km from job)`
              : `Job in ${conv?.job_area || "Koramangala"} (${conv?.distance_km ?? 1.4} km away)`}
          </span>
          {(() => {
            const d = conv?.distance_km ?? 1.4;
            const suit = getDistanceSuitability(d);
            return (
              <span
                className="ml-1 px-1.5 py-0.2 text-[8px] font-black text-white"
                style={{ backgroundColor: suit.color }}
              >
                {suit.badge}
              </span>
            );
          })()}
        </div>

        <div className="flex-1" />

        {/* Status bar Hire button when employer and not yet hired */}
        {myRole === "employer" && !isHired && (
          <button
            data-testid="chat-status-hire-btn"
            onClick={() => setHireModalOpen(true)}
            className="border-2 border-ink bg-brand px-3 py-1 text-[10px] font-black uppercase text-white hover:bg-black transition shadow-[1.5px_1.5px_0px_#121212]"
          >
            ⚡ HIRE PRO (₹{hirePay.toLocaleString("en-IN")})
          </button>
        )}

        {status === "completed" &&
          (myReviewDone ? (
            <span
              data-testid="chat-reviewed-pill"
              className="flex items-center gap-1 border border-ink bg-ok px-3 py-1.5 text-[10px] font-black text-white"
            >
              <Star size={11} /> REVIEWED
            </span>
          ) : (
            <button
              data-testid="chat-review-btn"
              onClick={() => setReviewOpen(true)}
              className="border-2 border-ink bg-brand px-3 py-1.5 text-[10px] font-black text-white hover:bg-brand/90 transition"
            >
              ★ RATE {myRole === "employer" ? "PRO" : "EMPLOYER"}
            </button>
          ))}
      </div>

      {/* PINNED WORKHOP DEAL TRACKER & 5-STEP PROCESS */}
      <DealTracker
        deal={deal}
        events={dealEvents}
        myRole={myRole}
        isHired={isHired}
        otherName={otherName}
        jobTitle={conv?.job_title}
        defaultPay={hirePay}
        onOpenHire={() => setHireModalOpen(true)}
        onDealUpdated={(newDeal, newEvents) => {
          setDeal(newDeal);
          setDealEvents(newEvents || []);
          loadMessages();
        }}
        onOpenReview={() => setReviewOpen(true)}
      />

      {/* MESSAGES THREAD */}
      <div ref={scrollRef} className="wh-scroll flex-1 overflow-y-auto p-4 sm:p-6 bg-sand/30 dark:bg-[#121212]">
        {/* PRIVACY / HIRING NOTICE */}
        {!isHired ? (
          <div
            className="mb-4 flex items-center justify-between gap-3 border-2 border-ink dark:border-amber-700/80 bg-[#FFF3C4] dark:bg-amber-950/50 p-3"
            data-testid="chat-privacy-notice"
          >
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-700 dark:text-amber-300 shrink-0" />
              <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Direct phone number sharing is locked until hiring is completed.
              </span>
            </div>
            {myRole === "employer" && (
              <button
                onClick={() => setHireModalOpen(true)}
                className="border-2 border-ink bg-brand px-2.5 py-1 text-[10px] font-black uppercase text-white hover:bg-black transition shadow-[1px_1px_0px_#121212] shrink-0"
              >
                Hire Pro Now
              </button>
            )}
          </div>
        ) : (
          <div
            className="mb-4 flex items-center gap-2 border-2 border-ink dark:border-emerald-700/80 bg-[#E5F8EE] dark:bg-emerald-950/50 p-3"
            data-testid="chat-hired-notice"
          >
            <CheckCircle2 size={16} className="text-ok shrink-0" />
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
              🎉 Gig Hired! Phone numbers, WhatsApp, and direct contact details can now be shared freely.
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-ink dark:text-white" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div data-testid="chat-empty" className="my-10 text-center">
            <p className="text-sm font-black text-ink dark:text-white">
              {searchQuery ? "No matching messages found." : "Say hello to start the conversation!"}
            </p>
            <p className="text-xs text-inkmuted dark:text-zinc-400 mt-1">
              {searchQuery ? "Try a different search term." : "Pitch your skills or clarify job expectations."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredMessages.map((m) => {
              if (m.sender_role === "system") {
                return (
                  <div key={m.message_id} className="my-2 flex justify-center">
                    <div
                      data-testid="system-chat-message"
                      className="max-w-[90%] sm:max-w-[80%] flex items-center gap-2 border border-ink/30 dark:border-zinc-700 bg-white/95 dark:bg-zinc-800 px-3.5 py-2 rounded-full text-xs font-bold text-ink dark:text-zinc-200 shadow-sm text-center"
                    >
                      <Sparkles size={13} className="text-brand shrink-0" />
                      <span className="leading-snug">{m.text}</span>
                    </div>
                  </div>
                );
              }
              const mine = m.sender_role === myRole;
              return (
                <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] border-2 border-ink dark:border-zinc-700 px-4 py-2.5 shadow-[2px_2px_0px_#121212] ${
                      mine ? "bg-brand text-white" : "bg-white dark:bg-zinc-800 text-ink dark:text-zinc-100"
                    }`}
                  >
                    <p className="text-sm leading-5 whitespace-pre-wrap">
                      {!isHired ? redactViolations(m.text) : m.text}
                    </p>
                    <div
                      className={`mt-1.5 flex items-center justify-end gap-1.5 text-[9px] font-bold ${
                        mine ? "text-[#FFD9C2]" : "text-inkmuted dark:text-zinc-400"
                      }`}
                    >
                      <span>
                        {new Date(m.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {mine && (
                        <span className="flex items-center gap-0.5 text-white" title="Delivered & Seen">
                          <CheckCheck size={13} className="text-white" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* TYPING INDICATOR */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2">
                  <span className="text-xs font-bold text-inkmuted dark:text-zinc-400">{otherName} is typing</span>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ATTACHMENT PREVIEW BEFORE SENDING */}
      {attachment && (
        <div className="flex items-center justify-between border-t-2 border-ink dark:border-amber-700/80 bg-[#FFF3C4] dark:bg-amber-950/70 px-4 py-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {attachment.type === "image" ? (
              <ImageIcon size={16} className="text-brand shrink-0" />
            ) : (
              <FileText size={16} className="text-brand shrink-0" />
            )}
            <span className="truncate text-xs font-bold text-ink dark:text-amber-200">
              Ready to send: {attachment.name}
            </span>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="flex h-5 w-5 items-center justify-center bg-ink text-white dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* REAL-TIME CONTACT VIOLATION WARNING BEFORE HIRING */}
      {contactViolation && !isHired && (
        <div
          data-testid="contact-violation-alert"
          className="flex items-center justify-between gap-3 border-t-2 border-amber-600 bg-amber-50 dark:bg-amber-950/90 px-4 py-2.5 text-xs font-bold text-amber-950 dark:text-amber-200 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-amber-700 dark:text-amber-400 shrink-0" />
            <span>
              🔒 Phone numbers cannot be shared before hiring ({contactViolation.label}). Click <strong>"HIRE PRO"</strong> at the top of the chat box to hire first and unlock contact sharing!
            </span>
          </div>
          {myRole === "employer" && (
            <button
              type="button"
              onClick={() => setHireModalOpen(true)}
              className="border-2 border-ink bg-brand px-3 py-1 text-[11px] font-black uppercase text-white shadow-[1.5px_1.5px_0px_#121212] hover:bg-black transition shrink-0"
            >
              Hire Pro Now
            </button>
          )}
        </div>
      )}

      {/* COMPOSER WITH ATTACHMENT SUPPORT */}
      <div
        className="flex items-end gap-2 border-t-2 border-ink dark:border-zinc-800 bg-white dark:bg-[#18181b] p-3"
        data-testid="chat-composer"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink dark:border-zinc-700 bg-sand hover:bg-[#FFE5D6] dark:bg-zinc-800 dark:hover:bg-zinc-700 transition"
          title="Attach image or file (Max 5MB)"
        >
          <Paperclip size={18} className="text-ink dark:text-zinc-200" />
        </button>

        {/* QUICK SHARE PHONE BUTTON (UNLOCKED ONCE HIRED) */}
        {isHired && (
          <button
            type="button"
            onClick={() => {
              const num = prompt("Enter phone number to share in chat (e.g. +91 98765 43210):");
              if (num && num.trim()) {
                setText((prev) => (prev ? `${prev} · 📱 Mobile/WhatsApp: ${num.trim()}` : `📱 My Phone / WhatsApp: ${num.trim()}`));
              }
            }}
            className="flex h-11 items-center gap-1.5 border-2 border-ink dark:border-zinc-700 bg-[#E5F8EE] dark:bg-[#153424] px-2.5 sm:px-3 text-xs font-black text-ok hover:bg-[#d0f3e0] transition shrink-0 shadow-[1px_1px_0px_#121212]"
            title="Share Phone / WhatsApp (Unlocked because gig is hired)"
          >
            <Phone size={14} />
            <span className="hidden sm:inline">SHARE PHONE</span>
          </button>
        )}

        <textarea
          data-testid="chat-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // Simulate brief typing indicator
            if (!isTyping && Math.random() > 0.8) {
              setIsTyping(true);
              setTimeout(() => setIsTyping(false), 2000);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            isHired
              ? "Type a message… (Phone numbers & WhatsApp allowed!)"
              : "Type a message… (Phone numbers unlocked after hiring)"
          }
          className="wh-input min-h-[44px] max-h-28 flex-1 resize-none border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-ink dark:text-white dark:placeholder:text-zinc-500 outline-none"
        />

        <button
          data-testid="chat-send-btn"
          onClick={send}
          disabled={(!text.trim() && !attachment) || sending || (Boolean(contactViolation) && !isHired)}
          title={
            Boolean(contactViolation) && !isHired
              ? "Phone numbers locked before hiring. Click Hire Pro at the top to unlock."
              : "Send message"
          }
          className={`flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink dark:border-zinc-700 transition ${
            Boolean(contactViolation) && !isHired
              ? "bg-amber-500 text-white cursor-not-allowed"
              : "bg-ink text-white disabled:opacity-40 hover:bg-brand dark:hover:bg-brand"
          }`}
        >
          {sending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : Boolean(contactViolation) && !isHired ? (
            <Lock size={18} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {/* RATING & REVIEW MODAL WITH PROMPTS */}
      {reviewOpen && (
        <div
          data-testid="review-modal"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-6"
        >
          <div className="flex w-full max-w-md flex-col items-center gap-3 border-2 border-ink dark:border-zinc-700 bg-white dark:bg-[#18181b] p-6 shadow-xl">
            <p className="text-center text-lg font-black text-ink dark:text-white">
              Rate {myRole === "employer" ? conv?.freelancer_name : conv?.company_name}
            </p>
            <p className="text-center text-xs text-inkmuted dark:text-zinc-400 font-semibold">{conv?.job_title}</p>

            {/* STAR RATING */}
            <div className="my-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  data-testid={`star-${s}`}
                  onClick={() => setRating(s)}
                  className="transition hover:scale-110"
                >
                  <Star
                    size={34}
                    className="text-brand"
                    fill={s <= rating ? "#E65A1E" : "none"}
                  />
                </button>
              ))}
            </div>

            {/* FIVERR-STYLE REVIEW PROMPT CHIPS */}
            <div className="w-full">
              <span className="text-[10px] font-black uppercase text-inkmuted dark:text-zinc-400">
                QUICK FEEDBACK PROMPTS
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[
                  "Great communication",
                  "Fast turnaround",
                  "High quality work",
                  "Fair pricing",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      setReviewText((prev) =>
                        prev ? `${prev} · ${chip}` : chip
                      )
                    }
                    className="border border-ink dark:border-zinc-700 bg-sand dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-ink dark:text-zinc-200 hover:bg-[#FFE5D6] dark:hover:bg-zinc-700"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full">
              <textarea
                data-testid="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience (minimum 10 characters recommended)…"
                className="wh-input min-h-[80px] w-full border-2 border-ink dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-sm text-ink dark:text-white dark:placeholder:text-zinc-500 outline-none"
              />
              <span className="text-[10px] text-inkmuted dark:text-zinc-400 font-semibold">
                {reviewText.length}/500 characters
              </span>
            </div>

            <button
              data-testid="review-submit-btn"
              disabled={rating < 1 || busy}
              onClick={submitReview}
              className="w-full border-2 border-ink dark:border-zinc-700 bg-ink dark:bg-brand py-3 text-[13px] font-black tracking-wider text-white disabled:opacity-50 hover:bg-brand transition"
            >
              {busy ? <Loader2 size={16} className="mx-auto animate-spin" /> : "SUBMIT REVIEW"}
            </button>
            <button
              data-testid="review-cancel-btn"
              onClick={() => setReviewOpen(false)}
              className="text-xs font-bold text-inkmuted dark:text-zinc-400 hover:text-ink dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* HIRE MODAL (HIRE BUTTON AT TOP OF CHAT BOX) */}
      {hireModalOpen && (
        <div
          data-testid="chat-hire-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
        >
          <div className="w-full max-w-md border-3 border-ink bg-white dark:bg-[#18181b] p-6 shadow-[5px_5px_0px_#121212] flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b-2 border-ink dark:border-zinc-700 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-brand text-white font-black text-base shadow-[1.5px_1.5px_0px_#121212]">
                  ⚡
                </span>
                <div>
                  <h3 className="text-base font-black text-ink dark:text-white uppercase leading-tight">
                    Hire {conv?.freelancer_name || "Pro"}
                  </h3>
                  <p className="text-[11px] text-inkmuted dark:text-zinc-400 font-semibold truncate">
                    {conv?.job_title || "Bengaluru Gig"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHireModalOpen(false)}
                className="p-1 hover:bg-sand dark:hover:bg-zinc-800 transition text-ink dark:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Agreed Pay Input */}
            <div>
              <label className="block text-xs font-black uppercase text-ink dark:text-white mb-1">
                Agreed Payout (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-ink dark:text-white">
                  ₹
                </span>
                <input
                  type="number"
                  value={hirePay}
                  onChange={(e) => setHirePay(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full border-2 border-ink dark:border-zinc-700 bg-sand/30 dark:bg-zinc-900 py-2.5 pl-8 pr-3 text-sm font-black text-ink dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-800"
                />
              </div>
              <p className="mt-1 text-[10px] text-inkmuted dark:text-zinc-400 font-semibold">
                Confirm or adjust the amount agreed upon in your chat discussion.
              </p>
            </div>

            {/* Payment Mode Selection */}
            <div>
              <label className="block text-xs font-black uppercase text-ink dark:text-white mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHireMode("escrow")}
                  className={`p-3 text-left border-2 border-ink dark:border-zinc-700 transition ${
                    hireMode === "escrow"
                      ? "bg-[#FFE8DC] dark:bg-[#341b12] border-brand shadow-[2px_2px_0px_#E65A1E]"
                      : "bg-white dark:bg-zinc-800 hover:bg-sand/60 opacity-80"
                  }`}
                >
                  <p className="text-xs font-black text-brand flex items-center gap-1">
                    <ShieldCheck size={14} /> ESCROW
                  </p>
                  <p className="text-[10px] text-inkmuted dark:text-zinc-300 mt-1 font-semibold leading-tight">
                    Protected deposit. 5% platform fee. Auto-releases on delivery.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setHireMode("direct")}
                  className={`p-3 text-left border-2 border-ink dark:border-zinc-700 transition ${
                    hireMode === "direct"
                      ? "bg-[#FFF3C4] dark:bg-[#2c2411] border-amber-600 shadow-[2px_2px_0px_#d97706]"
                      : "bg-white dark:bg-zinc-800 hover:bg-sand/60 opacity-80"
                  }`}
                >
                  <p className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles size={14} /> DIRECT (0% FEE)
                  </p>
                  <p className="text-[10px] text-inkmuted dark:text-zinc-300 mt-1 font-semibold leading-tight">
                    Settle directly via UPI. 0% fee. At your own risk.
                  </p>
                </button>
              </div>
            </div>

            {/* Contact Sharing Notice */}
            <div className="border border-brand/40 bg-brand/10 dark:bg-brand/20 p-2.5 text-xs text-brand font-bold flex items-start gap-2">
              <Phone size={14} className="shrink-0 mt-0.5" />
              <span>
                Once you click Hire, phone number &amp; WhatsApp exchange is immediately unlocked for both you and the pro!
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => setHireModalOpen(false)}
                className="flex-1 border-2 border-ink dark:border-zinc-700 py-2.5 text-xs font-black uppercase text-ink dark:text-white hover:bg-sand dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-hire-btn"
                disabled={hireBusy || !hirePay || Number(hirePay) <= 0}
                onClick={handleConfirmHire}
                className="flex-1 flex items-center justify-center gap-1.5 border-2 border-ink bg-brand py-2.5 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212] hover:bg-black transition disabled:opacity-50"
              >
                {hireBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>CONFIRM &amp; HIRE</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
