import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailOpen, ChevronRight, MapPin, Trophy, Sparkles, Coins } from "lucide-react";
import { Shell, TopBar, Spinner, EmptyBlock } from "@/components/kit";
import { getDistanceSuitability } from "@/lib/locationAreas";
import { apiGet } from "@/lib/api";
import ApplicantLeaderboardModal from "@/components/ApplicantLeaderboardModal";

export default function Inbox() {
  const nav = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardJob, setLeaderboardJob] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet("/chats");
      // Sort applicants: boosted first, then by timestamp
      const sorted = [...(data || [])].sort((a, b) => {
        const boostA = a.boost_credits || 0;
        const boostB = b.boost_credits || 0;
        if (boostB !== boostA) return boostB - boostA;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      setChats(sorted);
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
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 sm:p-6 pb-16">
          {chats.map((c, i) => {
            const dist = c.distance_km ?? 1.4;
            const suit = getDistanceSuitability(dist);
            const applicantArea = c.applicant_area || "Indiranagar";
            const isBoosted = (c.boost_credits || 0) > 0;
            const isTopRank = i < 3 && isBoosted;

            return (
              <div
                key={c.conversation_id || c.id}
                data-testid={`inbox-row-${i}`}
                className={`border-2 border-ink p-3.5 text-left transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_#121212] ${
                  isTopRank
                    ? "bg-[#FFF9E6] dark:bg-[#201c10] ring-2 ring-[#F59E0B]"
                    : "bg-white dark:bg-[#141414]"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-brand text-lg font-black text-white">
                    {(c.freelancer_name || "Pro").slice(0, 1).toUpperCase()}
                    {isTopRank && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-ink bg-[#F59E0B] text-[10px] text-white">
                        ★
                      </span>
                    )}
                  </div>
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => nav(`/chat/${c.conversation_id || c.id}?role=employer`)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-black text-ink dark:text-white">
                        {c.freelancer_name || "Verified Pro"}
                      </p>
                      {isTopRank && (
                        <span className="border border-ink bg-[#FFF3C4] px-1.5 py-0.2 text-[8px] font-black uppercase text-[#92400E] shadow-[1px_1px_0px_#121212] flex items-center gap-0.5">
                          <Sparkles size={10} /> FEATURED PROPOSAL #{i + 1}
                        </span>
                      )}
                      {isBoosted && (
                        <span className="border border-ink bg-amber-500 px-1.5 py-0.2 text-[8px] font-black text-white flex items-center gap-0.5">
                          <Coins size={9} /> +{c.boost_credits} Hops Bid
                        </span>
                      )}
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

                    <div className="mt-1 flex items-center gap-2 text-[10px] text-inkmuted dark:text-stone-400 font-semibold flex-wrap">
                      <span className="flex items-center gap-0.5 text-ink dark:text-stone-300 font-bold">
                        <MapPin size={10} className="text-brand" /> From {applicantArea} · {dist} km away
                      </span>
                      <span>•</span>
                      <span className="truncate">{c.last_message || "Application submitted"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => nav(`/chat/${c.conversation_id || c.id}?role=employer`)}
                      className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <ChevronRight size={18} className="text-inkmuted" />
                    </button>
                    {c.job_id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeaderboardJob({ id: c.job_id, title: c.job_title });
                        }}
                        className="flex items-center gap-1 border border-ink bg-white dark:bg-stone-800 px-2 py-0.5 text-[9px] font-black uppercase text-ink dark:text-white hover:bg-[#FFF3C4] hover:text-black transition"
                        title="View Bid Leaderboard"
                      >
                        <Trophy size={10} className="text-amber-500" /> BIDS
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard Modal */}
      {leaderboardJob && (
        <ApplicantLeaderboardModal
          isOpen={Boolean(leaderboardJob)}
          onClose={() => setLeaderboardJob(null)}
          jobId={leaderboardJob.id}
          jobTitle={leaderboardJob.title}
        />
      )}
    </Shell>
  );
}
