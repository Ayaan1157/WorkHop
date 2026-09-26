import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessagesSquare, X, Send, Search, ChevronLeft, ShieldCheck, MapPin,
  Clock, Paperclip, CheckCheck, Sparkles, Flame, User, ArrowUpRight, Trophy,
  ExternalLink, Maximize2
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { getStoredChats } from "@/lib/clientStore";
import { getDistanceSuitability } from "@/lib/locationAreas";

export default function FloatingChatWidget({ role = "employer" }) {
  const nav = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'urgent'
  const [attachment, setAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load chats
  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet("/chats");
      if (Array.isArray(data) && data.length > 0) {
        setChats(data);
      } else {
        const stored = getStoredChats();
        setChats(stored || []);
      }
    } catch {
      const stored = getStoredChats();
      setChats(stored || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Handle ESC key to close full screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Load messages when conversation is selected
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const msgs = await apiGet(`/chats/${convId}/messages`);
      if (Array.isArray(msgs) && msgs.length > 0) {
        setMessages(msgs);
      } else {
        setMessages([
          {
            id: "m-welcome",
            sender_role: "system",
            text: "Direct application thread opened. You are chatting directly with this candidate.",
            created_at: new Date().toISOString()
          },
          {
            id: "m-hello",
            sender_role: role === "employer" ? "freelancer" : "employer",
            text: "Hello! I am ready to start immediately. Please let me know if you would like to review my recent work.",
            created_at: new Date(Date.now() - 60000).toISOString()
          }
        ]);
      }
    } catch {
      setMessages([
        {
          id: "m-hello",
          sender_role: role === "employer" ? "freelancer" : "employer",
          text: "Hi! Thanks for connecting. Feel free to discuss timeline and project deliverables.",
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoadingMessages(false);
    }
  }, [role]);

  useEffect(() => {
    if (selectedConv) {
      const id = selectedConv.conversation_id || selectedConv.id;
      loadMessages(id);
    }
  }, [selectedConv, loadMessages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-select first chat when modal opens on desktop if none selected
  useEffect(() => {
    if (isOpen && !selectedConv && chats.length > 0 && window.innerWidth >= 768) {
      setSelectedConv(chats[0]);
    }
  }, [isOpen, selectedConv, chats]);

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if ((!text && !attachment) || sending || !selectedConv) return;

    setSending(true);
    const convId = selectedConv.conversation_id || selectedConv.id;
    const msgPayload = attachment ? `${text ? text + "\n" : ""}[Attachment: ${attachment.name}]` : text;

    const optimisticMsg = {
      id: `msg-${Date.now()}`,
      sender_role: role,
      text: msgPayload,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputMessage("");
    setAttachment(null);

    try {
      await apiPost(`/chats/${convId}/messages`, {
        sender_role: role,
        text: msgPayload
      });
    } catch {
      // Message already in optimistic state
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(`Attachment "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5MB.`);
      return;
    }
    setAttachment({
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "doc"
    });
  };

  // Filtered chats
  const filteredChats = chats.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    const title = (c.job_title || "").toLowerCase();
    const name = (c.applicant_name || c.freelancer_name || c.employer_name || c.name || "").toLowerCase();
    const matchesQuery = !query || title.includes(query) || name.includes(query);
    if (activeTab === "urgent") {
      const isUrgent = Boolean(c.is_boosted || (c.boost_credits && c.boost_credits > 0));
      return matchesQuery && isUrgent;
    }
    return matchesQuery;
  });

  const unreadCount = chats.length;

  return (
    <>
      {/* FLOATING CIRCULAR CHAT BUTTON (Bottom Right - Fixed at all times while scrolling) */}
      <aside
        data-testid="floating-chat-container"
        className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8"
        aria-label="Floating chat launcher"
      >
        <button
          type="button"
          data-testid="floating-chat-btn"
          onClick={() => {
            setIsOpen(true);
            loadChats();
          }}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-brand text-white shadow-[3px_3px_0px_#121212] transition-all hover:scale-105 hover:shadow-[1px_1px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95 cursor-pointer"
          title="Open Messages & Applicant Chats (Full Screen)"
          aria-label="Open Messages and Applicant Chats"
        >
          <MessagesSquare size={24} className="text-white group-hover:scale-110 transition-transform" />

          {/* Unread Counter Badge */}
          {unreadCount > 0 && (
            <span
              data-testid="floating-chat-badge"
              className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-[#FF3B30] px-1 text-[10px] font-black text-white shadow-md animate-bounce"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}

          {/* Floating Tooltip */}
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded border-2 border-ink bg-white dark:bg-stone-900 px-2.5 py-1 text-[11px] font-black text-ink dark:text-white shadow-[2px_2px_0px_#121212] opacity-0 group-hover:opacity-100 sm:inline-block transition-opacity">
            💬 Open Full Screen Chat
          </span>
        </button>
      </aside>

      {/* FULL SCREEN CHAT MODAL OVERLAY */}
      {isOpen && (
        <div
          data-testid="fullscreen-chat-modal"
          className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#121212] text-ink dark:text-white animate-in fade-in zoom-in-95 duration-150"
        >
          {/* TOP BAR */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b-2 border-ink bg-sand/60 dark:bg-stone-900 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Back button on mobile when viewing conversation */}
              {selectedConv && (
                <button
                  type="button"
                  onClick={() => setSelectedConv(null)}
                  className="flex items-center gap-1 border border-ink bg-white dark:bg-stone-800 px-2 py-1 text-xs font-black md:hidden hover:bg-sand"
                >
                  <ChevronLeft size={16} /> BACK
                </button>
              )}

              <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]">
                <MessagesSquare size={18} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-ink dark:text-white uppercase">
                    MESSAGES &amp; APPLICANT INBOX
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 border border-ok bg-[#E5F8EE] dark:bg-[#153424] px-1.5 py-0.2 text-[9px] font-black uppercase text-ok">
                    ● LIVE CHAT
                  </span>
                </div>
                <p className="text-[11px] text-inkmuted dark:text-zinc-400 font-semibold">
                  Direct full-screen communication with verified pros &amp; employers
                </p>
              </div>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  nav("/employer/inbox");
                }}
                className="hidden sm:flex items-center gap-1 border-2 border-ink bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-black text-ink dark:text-white hover:bg-sand dark:hover:bg-stone-700 transition shadow-[1.5px_1.5px_0px_#121212]"
                title="Open Dedicated Inbox Page"
              >
                <ExternalLink size={13} />
                <span>INBOX PAGE</span>
              </button>

              <button
                type="button"
                data-testid="close-fullscreen-chat-btn"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1.5 border-2 border-ink bg-[#FF3B30] hover:bg-[#E02B20] px-3.5 py-1.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                title="Close Full Screen Chat (Esc)"
              >
                <X size={16} />
                <span className="hidden sm:inline">CLOSE [ESC]</span>
              </button>
            </div>
          </header>

          {/* MAIN TWO-PANEL CONTENT */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* LEFT PANEL: CONVERSATIONS LIST */}
            <div
              className={`w-full md:w-[360px] lg:w-[400px] border-r-2 border-ink flex flex-col shrink-0 bg-sand/20 dark:bg-stone-900/30 ${
                selectedConv ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Search & Tabs */}
              <div className="border-b-2 border-ink p-3 bg-white dark:bg-[#161618]">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmuted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search applicant or gig title…"
                    className="w-full border-2 border-ink bg-sand/30 dark:bg-stone-800 py-1.5 pl-8 pr-3 text-xs font-bold text-ink dark:text-white placeholder:text-inkmuted focus:outline-none focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-inkmuted hover:text-ink"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="mt-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`flex-1 border border-ink py-1 text-[10px] font-black uppercase transition ${
                      activeTab === "all"
                        ? "bg-ink text-white"
                        : "bg-white dark:bg-stone-800 text-ink dark:text-white hover:bg-sand"
                    }`}
                  >
                    ALL CHATS ({chats.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("urgent")}
                    className={`flex-1 flex items-center justify-center gap-1 border border-ink py-1 text-[10px] font-black uppercase transition ${
                      activeTab === "urgent"
                        ? "bg-[#FF3B30] text-white"
                        : "bg-white dark:bg-stone-800 text-ink dark:text-white hover:bg-[#FFEBEA]"
                    }`}
                  >
                    <Flame size={11} fill="currentColor" /> URGENT
                  </button>
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto divide-y divide-ink/10">
                {loading ? (
                  <div className="p-8 text-center text-xs font-bold text-inkmuted">
                    Loading conversations…
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessagesSquare size={32} className="mx-auto text-inkmuted/40" />
                    <p className="mt-2 text-xs font-black text-ink dark:text-white uppercase">No Conversations Found</p>
                    <p className="mt-1 text-[11px] text-inkmuted">
                      When a candidate applies to your gigs, their active thread appears here.
                    </p>
                  </div>
                ) : (
                  filteredChats.map((c, idx) => {
                    const id = c.conversation_id || c.id;
                    const isSelected = (selectedConv?.conversation_id || selectedConv?.id) === id;
                    const applicantName = c.applicant_name || c.freelancer_name || c.employer_name || c.name || "Candidate";
                    const isBoosted = Boolean(c.is_boosted || (c.boost_credits && c.boost_credits > 0));
                    const dist = c.distance_km ?? 1.2;

                    return (
                      <div
                        key={id || idx}
                        data-testid={`fullscreen-chat-thread-${idx}`}
                        onClick={() => setSelectedConv(c)}
                        className={`p-3.5 cursor-pointer text-left transition-all ${
                          isSelected
                            ? "bg-[#FFF3C4] dark:bg-stone-800 border-l-4 border-brand shadow-inner"
                            : "bg-white dark:bg-[#141414] hover:bg-sand/60 dark:hover:bg-stone-800/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-brand font-black text-white text-xs shadow-[1px_1px_0px_#121212]">
                            {applicantName.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <p className="text-xs font-black text-ink dark:text-white truncate">
                                  {applicantName}
                                </p>
                                <ShieldCheck size={12} className="text-ok shrink-0" />
                              </div>
                              <span className="text-[10px] font-semibold text-inkmuted whitespace-nowrap">
                                {c.updated_at ? new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                              </span>
                            </div>

                            <p className="text-[11px] font-bold text-inkmuted dark:text-zinc-400 truncate mt-0.5">
                              {c.job_title || "Verified Pro Gig"}
                            </p>

                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {isBoosted && (
                                <span className="border border-ink bg-[#FF3B30] px-1 py-0.2 text-[8px] font-black uppercase text-white flex items-center gap-0.5 shadow-[1px_1px_0px_#121212]">
                                  <Flame size={8} fill="currentColor" /> URGENT
                                </span>
                              )}
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-inkmuted">
                                <MapPin size={9} className="text-brand" /> {c.area || "Indiranagar"} · {dist}km
                              </span>
                              {c.status && (
                                <span className="border border-ink/40 bg-sand px-1 py-0.2 text-[8px] font-black uppercase text-ink">
                                  {c.status}
                                </span>
                              )}
                            </div>

                            {c.last_message && (
                              <p className="mt-1.5 text-[11px] text-inkmuted/80 dark:text-zinc-500 truncate italic">
                                &ldquo;{c.last_message}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT PANEL: ACTIVE CHAT CONVERSATION */}
            <div className={`flex-1 flex flex-col bg-white dark:bg-[#121212] ${!selectedConv ? "hidden md:flex" : "flex"}`}>
              {selectedConv ? (
                <>
                  {/* Chat Room Header */}
                  <div className="flex h-14 shrink-0 items-center justify-between border-b-2 border-ink bg-white dark:bg-[#161618] px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center border border-ink bg-brand font-black text-white text-xs">
                        {(selectedConv.applicant_name || selectedConv.freelancer_name || "Pro").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xs sm:text-sm font-black text-ink dark:text-white truncate">
                            {selectedConv.applicant_name || selectedConv.freelancer_name || selectedConv.name || "Candidate"}
                          </h2>
                          <span className="flex items-center gap-0.5 bg-ok/15 text-ok border border-ok px-1 py-0.2 text-[8px] font-black">
                            <ShieldCheck size={9} /> VERIFIED
                          </span>
                        </div>
                        <p className="text-[10px] text-inkmuted dark:text-zinc-400 font-semibold truncate">
                          Gig: {selectedConv.job_title || "Project Discussion"} · {selectedConv.area || "Bengaluru"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const id = selectedConv.freelancer_id || selectedConv.pro_id;
                          if (id) nav(`/pro/${id}`);
                        }}
                        className="hidden sm:flex items-center gap-1 border border-ink bg-sand px-2.5 py-1 text-[10px] font-black uppercase text-ink hover:bg-white transition"
                      >
                        <User size={11} /> VIEW PROFILE
                      </button>
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#FAF8F5] dark:bg-[#0E0E10]">
                    {loadingMessages ? (
                      <div className="py-12 text-center text-xs font-bold text-inkmuted">
                        Loading messages…
                      </div>
                    ) : (
                      messages.map((m, idx) => {
                        const isMe = m.sender_role === role;
                        const isSystem = m.sender_role === "system";

                        if (isSystem) {
                          return (
                            <div key={m.id || idx} className="my-2 flex justify-center">
                              <span className="border border-ink/30 bg-sand/80 px-3 py-1 text-[10px] font-bold text-inkmuted uppercase">
                                {m.text}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={m.id || idx}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[70%] border-2 border-ink p-3 text-xs font-bold shadow-[2px_2px_0px_#121212] ${
                                isMe
                                  ? "bg-brand text-white"
                                  : "bg-white dark:bg-stone-800 text-ink dark:text-white"
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                              <div
                                className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                                  isMe ? "text-white/80" : "text-inkmuted"
                                }`}
                              >
                                <span>
                                  {m.created_at
                                    ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : "Just now"}
                                </span>
                                {isMe && <CheckCheck size={11} />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input Bar */}
                  <form
                    onSubmit={handleSendMessage}
                    className="border-t-2 border-ink bg-white dark:bg-[#161618] p-3 sm:p-4"
                  >
                    {attachment && (
                      <div className="mb-2 flex items-center justify-between border border-ink bg-[#FFF3C4] px-3 py-1 text-xs font-black text-ink">
                        <span>📎 {attachment.name}</span>
                        <button type="button" onClick={() => setAttachment(null)} className="text-ink hover:text-brand">
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-sand hover:bg-white text-ink transition"
                        title="Attach file or screenshot (Max 5MB)"
                      >
                        <Paperclip size={16} />
                      </button>

                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your message… (Press Enter to send)"
                        className="flex-1 border-2 border-ink bg-white dark:bg-stone-800 px-3.5 py-2 text-xs font-bold text-ink dark:text-white placeholder:text-inkmuted focus:outline-none"
                      />

                      <button
                        type="submit"
                        disabled={(!inputMessage.trim() && !attachment) || sending}
                        className="flex h-10 items-center gap-1.5 border-2 border-ink bg-brand px-4 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
                      >
                        <Send size={14} />
                        <span className="hidden sm:inline">SEND</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                /* No Conversation Selected Placeholder */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAF8F5] dark:bg-[#0E0E10]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-[#FFF3C4] shadow-[3px_3px_0px_#121212]">
                    <MessagesSquare size={32} className="text-ink" />
                  </div>
                  <h3 className="mt-4 text-base font-black text-ink dark:text-white uppercase">
                    Select an Applicant Thread
                  </h3>
                  <p className="mt-1 max-w-sm text-xs font-semibold text-inkmuted dark:text-zinc-400">
                    Pick a conversation from the left to view applicant bids, portfolio links, and send instant direct messages.
                  </p>
                  {chats.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedConv(chats[0])}
                      className="mt-4 border-2 border-ink bg-brand px-4 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition"
                    >
                      Open First Conversation →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
