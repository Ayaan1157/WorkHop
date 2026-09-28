import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  User,
  Clock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  FileText,
  Filter,
} from "lucide-react";
import { Spinner } from "@/components/kit";

const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
};

const fmtRelativeTime = (iso) => {
  if (!iso) return "";
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
};

function StatusBadge({ status }) {
  const s = (status || "applied").toLowerCase();
  const config = {
    applied: { bg: "#E1EFFE", text: "#1E429F", label: "APPLIED" },
    hired: { bg: "#E5F7E0", text: "#0E6220", label: "HIRED / IN PROGRESS" },
    completed: { bg: "#121212", text: "#FFFFFF", label: "COMPLETED" },
  }[s] || { bg: "#F0F0ED", text: "#121212", label: s.toUpperCase() };

  return (
    <span
      className="inline-flex items-center gap-1 border border-ink/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-[1px_1px_0px_#121212]"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

export default function AdminChatsTab({ adminFetch }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [activeChatDetail, setActiveChatDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  // Fetch all conversations
  const loadConversations = useCallback(async (selectFirst = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch("/chats");
      const list = Array.isArray(data) ? data : [];
      setConversations(list);
      if (list.length > 0) {
        setSelectedConvId((prev) => {
          if (prev && list.some((c) => (c.id || c.conversation_id) === prev)) {
            return prev;
          }
          return selectFirst ? (list[0].id || list[0].conversation_id) : (prev || list[0].id || list[0].conversation_id);
        });
      }
    } catch (err) {
      setError(err?.message || "Failed to load chats.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  // Load message detail when selected conversation changes
  useEffect(() => {
    if (!selectedConvId) {
      setActiveChatDetail(null);
      return;
    }
    let isCancelled = false;
    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await adminFetch(`/chats/${selectedConvId}/messages`);
        if (!isCancelled) {
          setActiveChatDetail(res);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load chat messages:", err);
          // Fallback to finding conversation in list
          const fallbackConv = conversations.find(
            (c) => (c.id || c.conversation_id) === selectedConvId
          );
          setActiveChatDetail({
            conversation: fallbackConv || { id: selectedConvId },
            messages: fallbackConv?.messages || [],
            total_messages: (fallbackConv?.messages || []).length,
          });
        }
      } finally {
        if (!isCancelled) setLoadingDetail(false);
      }
    };
    loadDetail();
    return () => {
      isCancelled = true;
    };
  }, [selectedConvId, adminFetch, conversations]);

  // Copy transcript to clipboard
  const handleCopyTranscript = () => {
    if (!activeChatDetail) return;
    const conv = activeChatDetail.conversation || {};
    const msgs = activeChatDetail.messages || [];

    const lines = [
      `=== WORKHOP CHAT AUDIT TRANSCRIPT ===`,
      `Conversation ID: ${conv.id || conv.conversation_id || selectedConvId}`,
      `Gig Title: ${conv.job_title || "N/A"}`,
      `Employer: ${conv.employer_name || conv.company_name || "N/A"} (${conv.company_name || ""})`,
      `Freelancer: ${conv.freelancer_name || "N/A"}`,
      `Status: ${(conv.status || "applied").toUpperCase()}`,
      `Exported At: ${new Date().toISOString()}`,
      `Total Messages: ${msgs.length}`,
      `======================================`,
      "",
    ];

    msgs.forEach((m, idx) => {
      const role = (m.sender_role || "user").toUpperCase();
      const sender = m.sender_name || (m.sender_role === "employer" ? conv.company_name : conv.freelancer_name);
      const time = fmtDate(m.created_at);
      const flag = m.has_violation ? " [⚠️ CONTACT SCREENING ALERT]" : "";
      lines.push(`[${idx + 1}] ${time} | ${role}: ${sender}${flag}`);
      lines.push(`${m.text}`);
      lines.push("");
    });

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    if (statusFilter === "flagged") {
      list = list.filter((c) => c.has_violation);
    } else if (statusFilter !== "all") {
      list = list.filter((c) => (c.status || "applied").toLowerCase() === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        const job = (c.job_title || "").toLowerCase();
        const company = (c.company_name || "").toLowerCase();
        const employer = (c.employer_name || "").toLowerCase();
        const freelancer = (c.freelancer_name || "").toLowerCase();
        const lastMsg = (c.last_message || "").toLowerCase();
        return (
          job.includes(q) ||
          company.includes(q) ||
          employer.includes(q) ||
          freelancer.includes(q) ||
          lastMsg.includes(q)
        );
      });
    }

    return list;
  }, [conversations, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = conversations.length;
    const totalMsgs = conversations.reduce((acc, c) => acc + (c.message_count || (c.messages?.length || 0)), 0);
    const hired = conversations.filter((c) => (c.status || "").toLowerCase() === "hired").length;
    const flagged = conversations.filter((c) => c.has_violation).length;
    return { total, totalMsgs, hired, flagged };
  }, [conversations]);

  const selectedConv = activeChatDetail?.conversation || conversations.find(
    (c) => (c.id || c.conversation_id) === selectedConvId
  );
  const currentMessages = activeChatDetail?.messages || selectedConv?.messages || [];
  const currentHasViolation = selectedConv?.has_violation || currentMessages.some((m) => m.has_violation);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & KPI Stat Tiles */}
      <div className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0px_#121212]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink/10 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-brand" />
              <h2 className="text-base font-black uppercase tracking-wider text-ink">
                Admin Chat Surveillance &amp; Audit Console
              </h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-inkmuted">
              Live platform-wide visibility into all direct messages between employers and freelancers. Monitor discussions, audit quotes, and prevent off-platform contact circumvention.
            </p>
          </div>
          <button
            onClick={() => loadConversations(false)}
            disabled={loading}
            className="flex items-center gap-1.5 border-2 border-ink bg-sand px-3 py-1.5 text-xs font-black uppercase tracking-wider text-ink shadow-[2px_2px_0px_#121212] transition hover:bg-brand hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="border-2 border-ink bg-sand/30 p-3 shadow-[2px_2px_0px_#121212]">
            <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted">Total Conversations</p>
            <p className="mt-1 text-2xl font-black text-ink">{stats.total}</p>
            <p className="text-[9px] font-bold text-inkmuted mt-0.5">Active &amp; past gig threads</p>
          </div>
          <div className="border-2 border-ink bg-sand/30 p-3 shadow-[2px_2px_0px_#121212]">
            <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted">Messages Exchanged</p>
            <p className="mt-1 text-2xl font-black text-ink">{stats.totalMsgs}</p>
            <p className="text-[9px] font-bold text-inkmuted mt-0.5">Platform-wide chat volume</p>
          </div>
          <div className="border-2 border-ink bg-[#E5F7E0] p-3 shadow-[2px_2px_0px_#121212]">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#0E6220]">Hired / In-Progress</p>
            <p className="mt-1 text-2xl font-black text-[#0E6220]">{stats.hired}</p>
            <p className="text-[9px] font-bold text-[#0E6220]/80 mt-0.5">Gigs currently active</p>
          </div>
          <div
            className={`border-2 border-ink p-3 shadow-[2px_2px_0px_#121212] ${
              stats.flagged > 0 ? "bg-[#FDE8E8] text-[#9B1C1C]" : "bg-white text-ink"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider">
                {stats.flagged > 0 ? "Compliance Alerts" : "Policy Violations"}
              </p>
              {stats.flagged > 0 && <AlertTriangle size={14} className="text-[#9B1C1C]" />}
            </div>
            <p className="mt-1 text-2xl font-black">{stats.flagged}</p>
            <p className="text-[9px] font-bold mt-0.5">
              {stats.flagged > 0 ? "Off-platform contacts detected" : "All conversations compliant"}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white p-3 shadow-[3px_3px_0px_#121212]">
        <div className="relative min-w-[260px] flex-1 sm:max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmuted" />
          <input
            type="text"
            placeholder="Search candidate, employer, gig title, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-2 border-ink bg-sand/20 py-1.5 pl-9 pr-3 text-xs font-bold text-ink placeholder:text-inkmuted/60 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted mr-1">Filter:</span>
          {[
            { id: "all", label: "ALL THREADS" },
            { id: "applied", label: "APPLIED" },
            { id: "hired", label: "HIRED" },
            { id: "completed", label: "COMPLETED" },
            { id: "flagged", label: `FLAGGED (${stats.flagged})`, tone: stats.flagged > 0 ? "red" : "default" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`border-2 border-ink px-2.5 py-1 text-[10px] font-black tracking-wider transition ${
                statusFilter === f.id
                  ? f.tone === "red"
                    ? "bg-[#9B1C1C] text-white shadow-[2px_2px_0px_#121212]"
                    : "bg-ink text-brand shadow-[2px_2px_0px_#121212]"
                  : f.tone === "red" && stats.flagged > 0
                  ? "bg-[#FDE8E8] text-[#9B1C1C] hover:bg-[#FBD5D5]"
                  : "bg-white text-ink hover:bg-sand"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split-Screen Console */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[650px]">
        {/* LEFT PANE: Conversation List */}
        <div className="lg:col-span-5 flex flex-col border-2 border-ink bg-white shadow-[4px_4px_0px_#121212]">
          <div className="flex items-center justify-between border-b-2 border-ink bg-sand/40 px-4 py-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink">
              Conversations ({filteredConversations.length})
            </span>
            <span className="text-[10px] font-bold text-inkmuted">Chronological</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[680px] divide-y-2 divide-ink/10">
            {loading && conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Spinner />
                <p className="mt-2 text-xs font-bold text-inkmuted">Loading message threads...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs font-bold text-inkmuted">No conversations match your search or filter.</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const cid = c.id || c.conversation_id;
                const isSelected = selectedConvId === cid;
                return (
                  <div
                    key={cid}
                    onClick={() => setSelectedConvId(cid)}
                    className={`cursor-pointer p-3.5 transition-all text-left ${
                      isSelected
                        ? "bg-[#FFF3C4] border-l-4 border-l-brand shadow-[inset_0_0_0_1px_#121212]"
                        : "hover:bg-sand/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-black text-ink line-clamp-1">
                        {c.job_title || "Gig Discussion"}
                      </h4>
                      <span className="shrink-0 text-[10px] font-bold text-inkmuted">
                        {fmtRelativeTime(c.last_message_at || c.created_at)}
                      </span>
                    </div>

                    {/* Participants row */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-ink">
                      <span className="inline-flex items-center gap-1 text-ink/80">
                        <Briefcase size={11} className="text-brand" />
                        {c.company_name || c.employer_name || "Employer"}
                      </span>
                      <span className="text-inkmuted font-normal">↔</span>
                      <span className="inline-flex items-center gap-1 text-ink">
                        <User size={11} className="text-inkmuted" />
                        {c.freelancer_name || "Freelancer"}
                      </span>
                    </div>

                    {/* Snippet */}
                    <p className="mt-1.5 line-clamp-2 text-[11px] text-inkmuted font-medium bg-sand/20 p-1.5 border border-ink/10 rounded-sm">
                      {c.last_message || "No message preview available."}
                    </p>

                    {/* Status & violation footer */}
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={c.status} />
                        <span className="text-[10px] font-bold text-inkmuted">
                          {c.message_count || (c.messages?.length || 1)} msgs
                        </span>
                      </div>

                      {c.has_violation && (
                        <span className="inline-flex items-center gap-1 border border-[#9B1C1C] bg-[#FDE8E8] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#9B1C1C]">
                          <AlertTriangle size={10} />
                          Contact Alert
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Message Transcript Inspector */}
        <div className="lg:col-span-7 flex flex-col border-2 border-ink bg-white shadow-[4px_4px_0px_#121212]">
          {!selectedConv ? (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
              <div className="border-2 border-ink bg-sand/40 p-4 shadow-[3px_3px_0px_#121212]">
                <MessageSquare size={32} className="text-inkmuted mx-auto" />
              </div>
              <h3 className="mt-4 text-sm font-black uppercase tracking-wider text-ink">
                No Conversation Selected
              </h3>
              <p className="mt-1 max-w-sm text-xs text-inkmuted font-medium">
                Choose any conversation thread from the left pane to audit the complete unredacted chronological transcript, sender identities, and compliance alerts.
              </p>
            </div>
          ) : (
            <>
              {/* Transcript Header */}
              <div className="border-b-2 border-ink bg-sand/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black uppercase tracking-tight text-ink">
                        {selectedConv.job_title || "Gig Discussion"}
                      </h3>
                      <StatusBadge status={selectedConv.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-ink">
                      <span>
                        <span className="text-inkmuted font-semibold">Employer: </span>
                        {selectedConv.company_name || selectedConv.employer_name || "Employer"}
                        {selectedConv.employer_area && ` (${selectedConv.employer_area})`}
                      </span>
                      <span className="text-inkmuted">•</span>
                      <span>
                        <span className="text-inkmuted font-semibold">Freelancer: </span>
                        {selectedConv.freelancer_name || "Freelancer"}
                        {selectedConv.freelancer_skill && ` · ${selectedConv.freelancer_skill}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyTranscript}
                      className="flex items-center gap-1.5 border-2 border-ink bg-white px-2.5 py-1 text-xs font-black uppercase tracking-wider text-ink shadow-[2px_2px_0px_#121212] transition hover:bg-sand"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-[#0E6220]" />
                          <span className="text-[#0E6220]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Transcript</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Anti-circumvention safety banner */}
                <div className="mt-3">
                  {currentHasViolation ? (
                    <div className="flex items-start gap-2 border-2 border-[#9B1C1C] bg-[#FDE8E8] p-2.5 text-xs text-[#9B1C1C]">
                      <ShieldAlert size={16} className="shrink-0 mt-0.5 text-[#9B1C1C]" />
                      <div>
                        <p className="font-black uppercase tracking-wide">
                          Off-Platform Contact Sharing Detected
                        </p>
                        <p className="font-medium text-[11px] mt-0.5">
                          One or more messages in this conversation contain phone number, email address, or external messaging patterns violating WorkHop’s safety and platform escrow guidelines.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 border border-ink/20 bg-white p-2 text-xs text-[#0E6220]">
                      <ShieldCheck size={14} className="shrink-0 text-[#0E6220]" />
                      <span className="font-bold text-[11px]">
                        Compliance Screening Passed: No prohibited direct phone/email bypass detected in this thread.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chronological Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[520px] bg-sand/10 space-y-4">
                {loadingDetail ? (
                  <div className="py-12 text-center">
                    <Spinner />
                    <p className="mt-2 text-xs font-bold text-inkmuted">Auditing messages...</p>
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs font-bold text-inkmuted">No messages in this conversation yet.</p>
                  </div>
                ) : (
                  currentMessages.map((msg, idx) => {
                    const isEmployer = (msg.sender_role || "").toLowerCase() === "employer";
                    const senderLabel = msg.sender_name || (isEmployer ? selectedConv.company_name : selectedConv.freelancer_name);

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${isEmployer ? "items-start" : "items-end"}`}
                      >
                        {/* Sender info line */}
                        <div className="flex items-center gap-2 mb-1 px-1 text-[10px] font-bold text-inkmuted">
                          <span
                            className={`border border-ink/40 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider ${
                              isEmployer ? "bg-ink text-white" : "bg-brand text-white"
                            }`}
                          >
                            {isEmployer ? "EMPLOYER" : "FREELANCER"}
                          </span>
                          <span className="text-ink font-black">{senderLabel}</span>
                          <span>•</span>
                          <span>{fmtDate(msg.created_at)}</span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[85%] border-2 p-3 text-xs font-medium shadow-[2px_2px_0px_#121212] ${
                            msg.has_violation
                              ? "border-[#9B1C1C] bg-[#FFF5F5] text-ink"
                              : isEmployer
                              ? "border-ink bg-white text-ink"
                              : "border-ink bg-[#FFF9ED] text-ink"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                          {/* Message Violation Flag */}
                          {msg.has_violation && (
                            <div className="mt-2 flex items-center gap-1.5 border-t border-[#9B1C1C]/30 pt-1.5 text-[10px] font-black uppercase text-[#9B1C1C]">
                              <AlertTriangle size={12} />
                              <span>Circumvention Alert: Contact info pattern flagged</span>
                            </div>
                          )}

                          {/* Attachment preview if any */}
                          {msg.attachment && (
                            <div className="mt-2 flex items-center gap-1.5 border border-ink/20 bg-sand/30 p-1.5 text-[10px] font-bold text-ink">
                              <FileText size={12} className="text-brand" />
                              <span>{msg.attachment.name || "Attached Document"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Transcript Metadata Footer */}
              <div className="border-t-2 border-ink bg-sand/30 px-4 py-2.5 text-[10px] font-bold text-inkmuted flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span>Thread ID: </span>
                  <code className="bg-white px-1 py-0.5 border border-ink/20 font-mono text-[9px] text-ink">
                    {selectedConv.id || selectedConv.conversation_id}
                  </code>
                </div>
                <div>
                  <span>Started: </span>
                  <span className="text-ink font-black">{fmtDate(selectedConv.created_at)}</span>
                  <span className="mx-2">•</span>
                  <span>Audited: </span>
                  <span className="text-ink font-black">{currentMessages.length} total messages</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
