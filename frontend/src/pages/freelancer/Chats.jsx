import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessagesSquare, ChevronRight, Clock } from "lucide-react";
import { Shell, TopBar, Spinner, EmptyBlock } from "@/components/kit";
import { apiGet, getFreelancerId } from "@/lib/api";
import { getStoredChats } from "@/lib/clientStore";
import { formatMessageTime } from "@/lib/utils";

export default function FreelancerChats() {
  const nav = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const fid = getFreelancerId();
      const qs = fid ? `?freelancer_id=${fid}` : "";
      const res = await apiGet(`/chats${qs}`).catch(() => []);
      const list = Array.isArray(res) && res.length > 0 ? res : getStoredChats();
      setChats(list);
    } catch {
      setChats(getStoredChats());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell>
      <TopBar title="MESSAGES" sub="Chats open when you apply to a gig" backTestID="chats-back-btn" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : chats.length === 0 ? (
        <EmptyBlock
          testID="chats-empty"
          icon={<MessagesSquare size={30} className="text-ink" />}
          title="No conversations yet"
          sub="Apply to a gig and a chat thread with the employer opens automatically."
          action={<button data-testid="chats-browse-btn" onClick={() => nav("/freelancer/jobs")} className="mt-1 bg-ink px-6 py-3 text-xs font-black tracking-wider text-white">BROWSE GIGS</button>}
        />
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 sm:p-6 pb-16">
          {chats.map((c, i) => (
            <button
              key={c.id || c.conversation_id || i}
              data-testid={`chat-row-${i}`}
              onClick={() => nav(`/chat/${c.id || c.conversation_id}?role=freelancer`)}
              className="flex items-center gap-3 border-2 border-ink bg-white p-3 text-left transition hover:translate-x-0.5 hover:shadow-[3px_3px_0px_#121212] active:translate-y-0.5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-ink text-lg font-black text-white">
                {(c.company_name || c.employer_name || "Employer").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-black text-ink">{c.company_name || c.employer_name || "Verified Employer"}</p>
                  {(c.last_message_at || c.updated_at) && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-inkmuted whitespace-nowrap">
                      <Clock size={10} className="opacity-70" />
                      {formatMessageTime(c.last_message_at || c.updated_at)}
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] font-bold text-brand">{c.job_title || "Gig Discussion"}</p>
                <p className="truncate text-xs text-inkmuted">{c.last_message || "Application sent — start the conversation"}</p>
              </div>
              <ChevronRight size={16} className="text-inkmuted shrink-0" />
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
