import { useEffect, useState } from "react";
import { Navigation, LocateFixed, AlertCircle } from "lucide-react";
import { Shell, TopBar, Spinner, IconBtn } from "@/components/kit";
import OSMMap from "@/components/OSMMap";
import { useUserLocation } from "@/hooks/useUserLocation";
import { apiGet } from "@/lib/api";

export default function LiveMap() {
  const [pins, setPins] = useState([]);
  const [center, setCenter] = useState({ lat: 12.9716, lng: 77.5946 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { coords, status, requestLocation } = useUserLocation();

  useEffect(() => {
    apiGet("/map/pins")
      .then((d) => {
        setPins([...(d.candidates || []), ...(d.employers || [])]);
        if (d.center) setCenter(d.center);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = pins.filter((p) => filter === "all" || p.kind === filter);
  const counts = {
    candidate: pins.filter((p) => p.kind === "candidate").length,
    employer: pins.filter((p) => p.kind === "employer").length,
  };

  return (
    <Shell>
      <TopBar
        title={coords ? "LIVE MAP · NEAR YOU" : "LIVE MAP · BENGALURU"}
        sub={`${counts.candidate} pros · ${counts.employer} hiring companies`}
        backTestID="map-back-btn"
        right={
          <IconBtn testID="map-locate-btn" onClick={requestLocation} active={!!coords}>
            {status === "locating" ? <Spinner className="!h-4 !w-4" /> : <LocateFixed size={20} className={coords ? "text-white" : "text-ink"} />}
          </IconBtn>
        }
      />

      {status === "idle" && !coords && (
        <div className="bg-ink">
          <button data-testid="map-locate-banner" onClick={requestLocation} className="mx-auto flex max-w-[1600px] w-full items-center gap-2 px-4 py-2.5 sm:px-8 text-left">
            <Navigation size={14} className="text-white" />
            <span className="flex-1 text-[11px] font-bold text-white">Use my location to find the closest pros & gigs</span>
            <span className="text-[11px] font-black tracking-wider text-brand">ENABLE</span>
          </button>
        </div>
      )}
      {(status === "denied" || status === "blocked") && (
        <div className="bg-ink">
          <div data-testid="map-locate-denied" className="mx-auto flex max-w-[1600px] w-full items-center gap-2 px-4 py-2.5 sm:px-8">
            <AlertCircle size={14} className="text-white" />
            <span className="flex-1 text-[11px] font-bold text-white">
              {status === "blocked" ? "Location is blocked. Enable it in your browser settings." : "Location permission needed to center the map on you."}
            </span>
            <button data-testid="map-locate-retry" onClick={requestLocation} className="text-[11px] font-black tracking-wider text-brand">RETRY</button>
          </div>
        </div>
      )}

      <div className="border-b-2 border-ink bg-white">
        <div className="mx-auto flex max-w-[1600px] gap-2 px-4 py-3 sm:px-8" data-testid="map-filter-row">
          {[
            { key: "all", label: "ALL" },
            { key: "candidate", label: "🟠 PROS" },
            { key: "employer", label: "⬛ EMPLOYERS" },
          ].map((f) => (
            <button
              key={f.key}
              data-testid={`map-filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={`border-2 border-ink px-3 py-1.5 text-[11px] font-black tracking-wider ${filter === f.key ? "bg-brand text-white" : "bg-white text-ink"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="h-[75vh] min-h-[500px] border-b-2 border-ink" data-testid="live-map">
          <OSMMap pins={visible} center={center} zoom={13} userLocation={coords} height="100%" />
        </div>
      )}

      <div className="bg-sand border-b-2 border-ink">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-6 p-4 sm:p-6 sm:px-8">
          <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full border-2 border-ink bg-brand" /><span className="text-xs font-bold text-ink">Verified pros</span></div>
          <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full border-2 border-ink bg-ink" /><span className="text-xs font-bold text-ink">Hiring employers</span></div>
          <span className="ml-auto text-xs text-inkmuted">Tap any pin to view details and contact info</span>
        </div>
      </div>
    </Shell>
  );
}
