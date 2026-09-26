import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Send, ShieldCheck, Star, Loader2, CheckCheck,
  Search, Paperclip, X, Image as ImageIcon, FileText, Sparkles, MapPin
} from "lucide-react";
import MilestoneTracker from "@/components/MilestoneTracker";
import { getDistanceSuitability } from "@/lib/locationAreas";
import { API, apiGet, apiPost } from "@/lib/api";
import { scanText, scanUploadFile } from "@/lib/contactScanner";

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

  const status = conv?.status || "applied";

  // Map conversation status to milestone key
  const getMilestoneKey = () => {
    if (myReviewDone) return "reviewed";
    if (status === "completed") return "released";
    if (status === "hired") return "in_progress";
    return "applied";
  };

  const loadMessages = useCallback(async () => {
    try {
      setMessages(await apiGet(`/chats/${id}/messages`));
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    apiGet(`/chats/${id}`)
      .then(setConv)
      .catch(() => {});
    loadMessages().finally(() => setLoading(false));
    apiGet(`/reviews?conversation_id=${id}`)
      .then((rev) => {
        if ((rev || []).some((x) => x.reviewer_role === myRole)) setMyReviewDone(true);
      })
      .catch(() => {});
    const timer = setInterval(loadMessages, 3000);
    return () => clearInterval(timer);
  }, [id, loadMessages, myRole]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isTyping]);

  const setStatus = async (next) => {
    setBusy(true);
    try {
      setConv(await apiPost(`/chats/${id}/status`, { status: next }));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
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

    // Screen attachment for contact info (phone numbers, emails, external links)
    const scanRes = await scanUploadFile(file);
    if (scanRes?.hasViolations) {
      alert(
        `Attachment blocked: Prohibited contact info detected (${scanRes.violations.map((v) => v.label).join(", ")}). Sharing phone numbers, emails, or personal contacts in chat is not allowed.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
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

    // Screen message text for phone numbers or emails
    if (body) {
      const textScan = scanText(body);
      if (textScan?.hasViolations) {
        alert(
          `Message blocked: Contact details detected (${textScan.violations.map((v) => v.label).join(", ")}). For your safety, sharing phone numbers, emails, or off-platform contacts is not allowed on WorkHop.`
        );
        return;
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
    <div className="flex h-screen w-full flex-col bg-white">
      {/* HEADER WITH ONLINE STATUS & SEARCH */}
      <div
        className="flex items-center gap-3 border-b-2 border-ink px-4 py-3 sm:px-8"
        data-testid="chat-topbar"
      >
        <button
          data-testid="chat-back-btn"
          onClick={() => nav(-1)}
          className="flex h-10 w-10 items-center justify-center border-2 border-ink hover:bg-sand transition"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-brand text-base font-black text-white">
            {(otherName || "?").slice(0, 1).toUpperCase()}
          </div>
          {/* ONLINE INDICATOR */}
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-ok" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-black text-ink">{otherName || "Chat"}</p>
            <span className="text-[10px] font-bold text-ok flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" /> Active now
            </span>
          </div>
          <p className="truncate text-[11px] text-inkmuted font-semibold">{conv?.job_title || ""}</p>
        </div>

        {/* SEARCH IN CHAT BUTTON */}
        <button
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setSearchQuery("");
          }}
          className={`flex h-9 w-9 items-center justify-center border-2 border-ink transition ${
            searchOpen ? "bg-ink text-white" : "bg-white text-ink hover:bg-sand"
          }`}
          title="Search in conversation"
        >
          <Search size={16} />
        </button>
      </div>

      {/* SEARCH BAR (COLLAPSIBLE) */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b-2 border-ink bg-sand px-4 py-2 animate-in fade-in duration-150">
          <Search size={14} className="text-inkmuted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages in this chat…"
            className="wh-input flex-1 bg-transparent text-xs font-semibold text-ink placeholder:text-inkmuted outline-none"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[10px] font-extrabold text-inkmuted">
              {filteredMessages.length} match{filteredMessages.length === 1 ? "" : "es"}
            </span>
          )}
          <button onClick={() => setSearchQuery("")} className="text-inkmuted hover:text-ink">
            <X size={14} />
          </button>
        </div>
      )}

      {/* STATUS & ACTIONS BAR */}
      <div
        className="flex items-center gap-2 border-b-2 border-ink bg-sand px-4 py-2 flex-wrap"
        data-testid="chat-status-bar"
      >
        <span
          className={`border border-ink px-3 py-1 text-[10px] font-black tracking-wider text-white ${
            status === "hired" ? "bg-brand" : status === "completed" ? "bg-ok" : "bg-ink"
          }`}
        >
          {status === "applied" ? "APPLIED" : status === "hired" ? "HIRED" : "COMPLETED"}
        </span>

        {/* Hyperlocal distance badge */}
        <div className="flex items-center gap-1.5 border border-ink bg-white px-2.5 py-1 text-[10px] font-black text-ink">
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

        {myRole === "employer" && status === "applied" && (
          <button
            data-testid="chat-hire-btn"
            disabled={busy}
            onClick={() => setStatus("hired")}
            className="border-2 border-ink bg-ink px-3 py-1.5 text-[10px] font-black text-white hover:bg-brand transition"
          >
            HIRE PRO
          </button>
        )}

        {myRole === "employer" && status === "hired" && (
          <button
            data-testid="chat-complete-btn"
            disabled={busy}
            onClick={() => setStatus("completed")}
            className="border-2 border-ink bg-ok px-3 py-1.5 text-[10px] font-black text-white hover:bg-ok/90 transition"
          >
            MARK COMPLETED &amp; RELEASE FUNDS
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

      {/* UPWORK-STYLE MILESTONE TIMELINE TRACKER */}
      <div className="border-b-2 border-ink bg-white px-4 py-2">
        <MilestoneTracker currentStep={getMilestoneKey()} />
      </div>

      {/* MESSAGES THREAD */}
      <div ref={scrollRef} className="wh-scroll flex-1 overflow-y-auto p-4 sm:p-6 bg-sand/30">
        <div
          className="mb-4 flex items-center gap-2 border-2 border-ink bg-white p-3"
          data-testid="chat-privacy-notice"
        >
          <ShieldCheck size={16} className="text-brand shrink-0" />
          <span className="text-xs font-semibold text-ink">
            Direct communication is protected. Employer details and phone numbers are shared after hire/unlock.
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-ink" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div data-testid="chat-empty" className="my-10 text-center">
            <p className="text-sm font-black text-ink">
              {searchQuery ? "No matching messages found." : "Say hello to start the conversation!"}
            </p>
            <p className="text-xs text-inkmuted mt-1">
              {searchQuery ? "Try a different search term." : "Pitch your skills or clarify job expectations."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredMessages.map((m) => {
              const mine = m.sender_role === myRole;
              return (
                <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] border-2 border-ink px-4 py-2.5 shadow-[2px_2px_0px_#121212] ${
                      mine ? "bg-brand text-white" : "bg-white text-ink"
                    }`}
                  >
                    <p className="text-sm leading-5 whitespace-pre-wrap">{m.text}</p>
                    <div
                      className={`mt-1.5 flex items-center justify-end gap-1.5 text-[9px] font-bold ${
                        mine ? "text-[#FFD9C2]" : "text-inkmuted"
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
                <div className="flex items-center gap-1.5 border-2 border-ink bg-white px-3 py-2">
                  <span className="text-xs font-bold text-inkmuted">{otherName} is typing</span>
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
        <div className="flex items-center justify-between border-t-2 border-ink bg-[#FFF3C4] px-4 py-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {attachment.type === "image" ? (
              <ImageIcon size={16} className="text-brand shrink-0" />
            ) : (
              <FileText size={16} className="text-brand shrink-0" />
            )}
            <span className="truncate text-xs font-bold text-ink">
              Ready to send: {attachment.name}
            </span>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="flex h-5 w-5 items-center justify-center bg-ink text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* COMPOSER WITH ATTACHMENT SUPPORT */}
      <div
        className="flex items-end gap-2 border-t-2 border-ink bg-white p-3"
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
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-sand hover:bg-[#FFE5D6] transition"
          title="Attach image or file (Max 5MB)"
        >
          <Paperclip size={18} className="text-ink" />
        </button>

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
          placeholder="Type a message… (Press Enter to send)"
          className="wh-input min-h-[44px] max-h-28 flex-1 resize-none border-2 border-ink px-3 py-2.5 text-sm text-ink outline-none"
        />

        <button
          data-testid="chat-send-btn"
          onClick={send}
          disabled={(!text.trim() && !attachment) || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-ink text-white disabled:opacity-40 hover:bg-brand transition"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* RATING & REVIEW MODAL WITH PROMPTS */}
      {reviewOpen && (
        <div
          data-testid="review-modal"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-6"
        >
          <div className="flex w-full max-w-md flex-col items-center gap-3 border-2 border-ink bg-white p-6">
            <p className="text-center text-lg font-black text-ink">
              Rate {myRole === "employer" ? conv?.freelancer_name : conv?.company_name}
            </p>
            <p className="text-center text-xs text-inkmuted font-semibold">{conv?.job_title}</p>

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
              <span className="text-[10px] font-black uppercase text-inkmuted">
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
                    className="border border-ink bg-sand px-2 py-0.5 text-[10px] font-bold text-ink hover:bg-[#FFE5D6]"
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
                className="wh-input min-h-[80px] w-full border-2 border-ink p-3 text-sm text-ink outline-none"
              />
              <span className="text-[10px] text-inkmuted font-semibold">
                {reviewText.length}/500 characters
              </span>
            </div>

            <button
              data-testid="review-submit-btn"
              disabled={rating < 1 || busy}
              onClick={submitReview}
              className="w-full border-2 border-ink bg-ink py-3 text-[13px] font-black tracking-wider text-white disabled:opacity-50 hover:bg-brand transition"
            >
              {busy ? <Loader2 size={16} className="mx-auto animate-spin" /> : "SUBMIT REVIEW"}
            </button>
            <button
              data-testid="review-cancel-btn"
              onClick={() => setReviewOpen(false)}
              className="text-xs font-bold text-inkmuted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
