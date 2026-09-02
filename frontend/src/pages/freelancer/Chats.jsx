import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessagesSquare, ChevronRight } from "lucide-react";
import { Shell, TopBar, Spinner, EmptyBlock } from "@/components/kit";
import { apiGet, getFreelancerId } from "@/lib/api";

export default function FreelancerChats() {
  const nav = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const fid = getFreelancerId();
      if (!fid) { setChats([]); return; }
      setChats(await apiGet(`/chats?freelancer_id=${fid}`));
    } catch { /* ignore */ } finally { setLoading(false); }
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
        <div className="flex flex-col gap-3 p-4 pb-16">
          {chats.map((c, i) => (
            <button key={c.conversation_id} data-testid={`chat-row-${i}`} onClick={() => nav(`/chat/${c.conversation_id}?role=freelancer`)} className="flex items-center gap-3 border-2 border-ink bg-white p-3 text-left transition active:translate-y-0.5">
              <div className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-ink text-lg font-black text-white">{c.company_name.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-ink">{c.company_name}</p>
                <p className="truncate text-[11px] font-bold text-brand">{c.job_title}</p>
                <p className="truncate text-xs text-inkmuted">{c.last_message || "Application sent — start the conversation"}</p>
              </div>
              <ChevronRight size={16} className="text-inkmuted" />
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
