import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailOpen, ChevronRight, MapPin } from "lucide-react";
import { Shell, TopBar, Spinner, EmptyBlock } from "@/components/kit";
import { getDistanceSuitability } from "@/lib/locationAreas";
import { apiGet } from "@/lib/api";

export default function Inbox() {
  const nav = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setChats(await apiGet("/chats"));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell>
      <TopBar
        title="APPLICANT INBOX"
        sub="Verified pros who applied to your gigs"
        backTestID="inbox-back-btn"
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : chats.length === 0 ? (
        <EmptyBlock
          testID="inbox-empty"
          icon={<MailOpen size={30} className="text-ink" />}
          title="No applicants yet"
          sub="When a verified pro applies to one of your gigs, their application and distance show up here."
        />
      ) : (
        <div className="flex flex-col gap-3 p-4 sm:p-6 pb-16">
          {chats.map((c, i) => {
            const dist = c.distance_km ?? 1.4;
            const suit = getDistanceSuitability(dist);
            const applicantArea = c.applicant_area || "Indiranagar";

            return (
              <button
                key={c.conversation_id || c.id}
                data-testid={`inbox-row-${i}`}
                onClick={() => nav(`/chat/${c.conversation_id || c.id}?role=employer`)}
                className="flex items-center gap-3.5 border-2 border-ink bg-white p-3.5 text-left transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#121212] active:translate-y-0.5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-brand text-lg font-black text-white">
                  {(c.freelancer_name || "Pro").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-sm font-black text-ink">{c.freelancer_name || "Verified Pro"}</p>
                    <span
                      className="border border-ink px-1.5 py-0.2 text-[8px] font-black text-white"
                      style={{ backgroundColor: suit.color }}
                    >
                      {suit.badge}
                    </span>
                  </div>

                  <p className="truncate text-[11px] font-bold text-brand">
                    {c.job_title} {c.company_name ? `· ${c.company_name}` : ""}
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-[10px] text-inkmuted font-semibold flex-wrap">
                    <span className="flex items-center gap-0.5 text-ink font-bold">
                      <MapPin size={10} className="text-brand" /> From {applicantArea} · {dist} km away
                    </span>
                    <span>•</span>
                    <span className="truncate">{c.last_message || "Application submitted"}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-inkmuted shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
