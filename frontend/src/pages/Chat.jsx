import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Send, ShieldCheck, Star, Loader2 } from "lucide-react";
import { API, apiGet, apiPost } from "@/lib/api";

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
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [myReviewDone, setMyReviewDone] = useState(false);
  const scrollRef = useRef(null);

  const status = conv?.status || "applied";

  const loadMessages = useCallback(async () => {
    try { setMessages(await apiGet(`/chats/${id}/messages`)); } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    apiGet(`/chats/${id}`).then(setConv).catch(() => {});
    loadMessages().finally(() => setLoading(false));
    apiGet(`/reviews?conversation_id=${id}`)
      .then((rev) => { if ((rev || []).some((x) => x.reviewer_role === myRole)) setMyReviewDone(true); })
      .catch(() => {});
    const timer = setInterval(loadMessages, 3000);
    return () => clearInterval(timer);
  }, [id, loadMessages, myRole]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const setStatus = async (next) => {
    setBusy(true);
    try { setConv(await apiPost(`/chats/${id}/status`, { status: next })); }
    catch { /* ignore */ } finally { setBusy(false); }
  };

  const submitReview = async () => {
    if (rating < 1) return;
    setBusy(true);
    try {
      await apiPost("/reviews", { conversation_id: id, reviewer_role: myRole, rating, text: reviewText });
      setMyReviewDone(true);
      setReviewOpen(false);
    } catch (e) {
      if (e?.status === 409) { setMyReviewDone(true); setReviewOpen(false); }
    } finally { setBusy(false); }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const r = await fetch(`${API}/chats/${id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_role: myRole, text: body }),
      });
      if (r.ok) { const msg = await r.json(); setMessages((m) => [...m, msg]); }
    } catch { /* ignore */ } finally { setSending(false); }
  };

  const otherName = myRole === "freelancer" ? conv?.company_name : conv?.freelancer_name;

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <div className="flex items-center gap-4 border-b-2 border-ink px-4 py-3 sm:px-8 lg:px-12" data-testid="chat-topbar">
        <button data-testid="chat-back-btn" onClick={() => nav(-1)} className="flex h-10 w-10 items-center justify-center border-2 border-ink"><ChevronLeft size={22} /></button>
        <div className="flex h-[38px] w-[38px] items-center justify-center border-2 border-ink bg-brand text-base font-black text-white">{(otherName || "?").slice(0, 1)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black text-ink">{otherName || "Chat"}</p>
          <p className="truncate text-[11px] text-inkmuted">{conv?.job_title || ""}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b-2 border-ink bg-sand px-4 py-2" data-testid="chat-status-bar">
        <span className={`border border-ink px-3 py-1 text-[10px] font-black tracking-wider text-white ${status === "hired" ? "bg-brand" : status === "completed" ? "bg-ok" : "bg-ink"}`}>
          {status === "applied" ? "APPLIED" : status === "hired" ? "HIRED" : "COMPLETED"}
        </span>
        <div className="flex-1" />
        {myRole === "employer" && status === "applied" && <button data-testid="chat-hire-btn" disabled={busy} onClick={() => setStatus("hired")} className="border-2 border-ink bg-ink px-3 py-1.5 text-[10px] font-black text-white">HIRE PRO</button>}
        {myRole === "employer" && status === "hired" && <button data-testid="chat-complete-btn" disabled={busy} onClick={() => setStatus("completed")} className="border-2 border-ink bg-ink px-3 py-1.5 text-[10px] font-black text-white">MARK COMPLETED</button>}
        {status === "completed" && (myReviewDone ? (
          <span data-testid="chat-reviewed-pill" className="flex items-center gap-1 border border-ink bg-ok px-3 py-1.5 text-[10px] font-black text-white"><Star size={11} /> REVIEWED</span>
        ) : (
          <button data-testid="chat-review-btn" onClick={() => setReviewOpen(true)} className="border-2 border-ink bg-brand px-3 py-1.5 text-[10px] font-black text-white">★ RATE {myRole === "employer" ? "PRO" : "EMPLOYER"}</button>
        ))}
      </div>

      <div ref={scrollRef} className="wh-scroll flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-2 border-2 border-ink bg-sand p-3" data-testid="chat-privacy-notice">
          <ShieldCheck size={14} className="text-ink" />
          <span className="text-[11px] text-ink">Employer details stay private until they choose to share them here.</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-ink" /></div>
        ) : messages.length === 0 ? (
          <p data-testid="chat-empty" className="my-8 text-center text-xs text-inkmuted">Say hello — pitch why you're the right pro for this gig.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.sender_role === myRole;
              return (
                <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] border-2 border-ink px-3 py-2 ${mine ? "bg-brand" : "bg-white"}`}>
                    <p className={`text-sm leading-5 ${mine ? "text-white" : "text-ink"}`}>{m.text}</p>
                    <p className={`mt-1 text-right text-[9px] ${mine ? "text-[#FFD9C2]" : "text-inkmuted"}`}>
                      {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t-2 border-ink bg-white p-3" data-testid="chat-composer">
        <textarea
          data-testid="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          className="wh-input min-h-[44px] max-h-28 flex-1 resize-none border-2 border-ink px-3 py-2.5 text-sm text-ink"
        />
        <button data-testid="chat-send-btn" onClick={send} disabled={!text.trim() || sending} className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-ink text-white disabled:opacity-40"><Send size={18} /></button>
      </div>

      {reviewOpen && (
        <div data-testid="review-modal" className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-6">
          <div className="flex w-full max-w-md flex-col items-center gap-3 border-2 border-ink bg-white p-6">
            <p className="text-center text-lg font-black text-ink">Rate {myRole === "employer" ? conv?.freelancer_name : conv?.company_name}</p>
            <p className="text-center text-xs text-inkmuted">{conv?.job_title}</p>
            <div className="my-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} data-testid={`star-${s}`} onClick={() => setRating(s)}>
                  <Star size={34} className="text-brand" fill={s <= rating ? "#FF5A00" : "none"} />
                </button>
              ))}
            </div>
            <textarea data-testid="review-text" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your experience (optional)…" className="wh-input min-h-[80px] w-full border-2 border-ink p-3 text-sm text-ink" />
            <button data-testid="review-submit-btn" disabled={rating < 1 || busy} onClick={submitReview} className="w-full border-2 border-ink bg-ink py-3 text-[13px] font-black tracking-wider text-white disabled:opacity-50">
              {busy ? <Loader2 size={16} className="mx-auto animate-spin" /> : "SUBMIT REVIEW"}
            </button>
            <button data-testid="review-cancel-btn" onClick={() => setReviewOpen(false)} className="text-xs font-bold text-inkmuted">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
