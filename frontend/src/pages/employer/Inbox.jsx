import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailOpen, ChevronRight } from "lucide-react";
import { Shell, TopBar, Spinner, EmptyBlock } from "@/components/kit";
import { apiGet } from "@/lib/api";

export default function Inbox() {
  const nav = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setChats(await apiGet("/chats")); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell>
      <TopBar title="APPLICANT INBOX" sub="Verified pros who applied to your gigs" backTestID="inbox-back-btn" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : chats.length === 0 ? (
        <EmptyBlock testID="inbox-empty" icon={<MailOpen size={30} className="text-ink" />} title="No applicants yet" sub="When a verified pro applies to one of your gigs, the chat shows up here." />
      ) : (
        <div className="flex flex-col gap-3 p-4 pb-16">
          {chats.map((c, i) => (
            <button key={c.conversation_id} data-testid={`inbox-row-${i}`} onClick={() => nav(`/chat/${c.conversation_id}?role=employer`)} className="flex items-center gap-3 border-2 border-ink bg-white p-3 text-left transition active:translate-y-0.5">
              <div className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-brand text-lg font-black text-white">{c.freelancer_name.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-ink">{c.freelancer_name}</p>
                <p className="truncate text-[11px] font-bold text-brand">{c.job_title} · {c.company_name}</p>
                <p className="truncate text-xs text-inkmuted">{c.last_message || "New application received"}</p>
              </div>
              <ChevronRight size={16} className="text-inkmuted" />
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
