import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Navigation, LocateFixed, AlertCircle, Search, Sparkles, MapPin,
  Filter, Users, Briefcase, Star, MessageSquare, ArrowUpRight,
  SlidersHorizontal, CheckCircle2, ChevronRight, Layers, Eye
} from "lucide-react";
import { Shell, TopBar, Spinner, IconBtn } from "@/components/kit";
import GoogleMap from "@/components/GoogleMap";
import { useUserLocation } from "@/hooks/useUserLocation";
import { BENGALURU_AREAS, findNearestArea, getAreaCoordinates } from "@/lib/locationAreas";
import { distanceKm } from "@/hooks/useUserLocation";
import { apiGet } from "@/lib/api";
import FALLBACK_LEADS from "@/data/leads.json";

export default function LiveMap() {
  const nav = useNavigate();
  const { coords: gpsCoords, status: locStatus, requestLocation } = useUserLocation();

  const [pins, setPins] = useState([]);
  const [leads, setLeads] = useState(FALLBACK_LEADS);
  const [loading, setLoading] = useState(true);

  // Active Location: either GPS coords or chosen named Bengaluru area
  const [selectedArea, setSelectedArea] = useState("Koramangala");
  const [userLocation, setUserLocation] = useState({ lat: 12.9352, lng: 77.6245 }); // Koramangala default
  const [radiusKm, setRadiusKm] = useState(5); // 2, 5, 10, 25 (all)

  // Filters & State
  const [filterType, setFilterType] = useState("all"); // all | candidate | employer
  const [catFilter, setCatFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPinId, setSelectedPinId] = useState(null);

  // Sync GPS Coordinates when acquired
  useEffect(() => {
    if (gpsCoords?.lat && gpsCoords?.lng) {
      setUserLocation(gpsCoords);
      const nearest = findNearestArea(gpsCoords);
      if (nearest) setSelectedArea(nearest.name);
    }
  }, [gpsCoords]);

  // Handle Manual Area Dropdown Change
  const handleAreaChange = (areaName) => {
    setSelectedArea(areaName);
    const coords = getAreaCoordinates(areaName);
    setUserLocation(coords);
  };

  // Fetch Map Pins & Leads
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet("/map/pins").catch(() => null),
      apiGet("/leads").catch(() => null),
    ])
      .then(([mapData, leadsData]) => {
        if (mapData) {
          setPins([...(mapData.candidates || []), ...(mapData.employers || [])]);
        }
        if (leadsData && Array.isArray(leadsData) && leadsData.length > 0) {
          setLeads(leadsData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute dynamic distance from active userLocation for all candidate leads
  const calculatedLeads = useMemo(() => {
    const activeLoc = userLocation || { lat: 12.9716, lng: 77.5946 };
    return leads.map((l) => {
      const dist = l.lat && l.lng ? distanceKm(activeLoc, { lat: l.lat, lng: l.lng }) : l.distance_km || 1.5;
      return {
        ...l,
        calculatedDist: Math.round(dist * 10) / 10,
      };
    });
  }, [leads, userLocation]);

  // Combined & Filtered Map Pins with real-time distance
  const dynamicPins = useMemo(() => {
    const activeLoc = userLocation || { lat: 12.9716, lng: 77.5946 };

    // Candidates pins from calculatedLeads
    const candidatePins = calculatedLeads.map((l) => ({
      id: l.id,
      kind: "candidate",
      title: l.name,
      subtitle: `${l.skill} · ${l.calculatedDist} km away`,
      lat: l.lat,
      lng: l.lng,
      distance_km: l.calculatedDist,
      rating: l.rating,
      rate_hr: l.rate_hr || (l.rate ? parseInt(l.rate) : 550),
      category: l.bucket || l.category || "General",
    }));

    // Employer pins from fetched pins
    const employerPins = pins
      .filter((p) => p.kind === "employer")
      .map((p) => {
        const dist = p.lat && p.lng ? distanceKm(activeLoc, { lat: p.lat, lng: p.lng }) : 2.5;
        return {
          ...p,
          distance_km: Math.round(dist * 10) / 10,
        };
      });

    let allPins = [...candidatePins, ...employerPins];

    // Filter by Radius if not "all" (e.g. 25km)
    if (radiusKm && radiusKm < 25) {
      allPins = allPins.filter((p) => (p.distance_km ?? 0) <= radiusKm);
    }

    // Filter by Pin Type (all | candidate | employer)
    if (filterType !== "all") {
      allPins = allPins.filter((p) => p.kind === filterType);
    }

    // Filter by Category
    if (catFilter !== "all") {
      allPins = allPins.filter((p) => {
        if (p.kind === "employer") return true;
        return (
          p.category?.toLowerCase().includes(catFilter.toLowerCase()) ||
          p.subtitle?.toLowerCase().includes(catFilter.toLowerCase())
        );
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      allPins = allPins.filter(
        (p) => p.title?.toLowerCase().includes(q) || p.subtitle?.toLowerCase().includes(q)
      );
    }

    // Sort by Closest Distance First
    return allPins.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  }, [calculatedLeads, pins, userLocation, radiusKm, filterType, catFilter, searchQuery]);

  // Filtered Close-by Candidates List
  const nearbyCandidates = useMemo(() => {
    return dynamicPins.filter((p) => p.kind === "candidate");
  }, [dynamicPins]);

  const nearbyEmployers = useMemo(() => {
    return dynamicPins.filter((p) => p.kind === "employer");
  }, [dynamicPins]);

  // Highlight / Pan to candidate
  const handleSelectPerson = (person) => {
    setSelectedPinId(person.id);
  };

  return (
    <Shell>
      <TopBar
        title={gpsCoords ? "GOOGLE LIVE MAP · NEAR YOU" : "GOOGLE LIVE MAP · BENGALURU"}
        sub={`Radar active: ${nearbyCandidates.length} pros & ${nearbyEmployers.length} hiring employers within ${radiusKm < 25 ? `${radiusKm}km` : "city"}`}
        backTestID="map-back-btn"
        right={
          <div className="flex items-center gap-2">
            <button
              data-testid="map-gps-btn"
              onClick={requestLocation}
              className={`flex items-center gap-1.5 border-2 border-ink px-3 py-1.5 text-xs font-black transition active:translate-y-0.5 ${
                gpsCoords
                  ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                  : "bg-white text-ink hover:bg-sand"
              }`}
              title="Detect my exact GPS location"
            >
              {locStatus === "locating" ? (
                <Spinner className="!h-3.5 !w-3.5 text-current" />
              ) : (
                <LocateFixed size={14} className={gpsCoords ? "text-white" : "text-brand"} />
              )}
              <span className="hidden sm:inline">{gpsCoords ? "GPS ACTIVE" : "USE GPS"}</span>
            </button>
          </div>
        }
      />

      {/* Geolocation Notice Banner if Denied */}
      {(locStatus === "denied" || locStatus === "blocked") && (
        <div className="bg-[#FFF4E5] border-b-2 border-ink px-4 py-2 text-xs font-bold text-ink">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-brand" />
              GPS permission is disabled. Select your Bengaluru area below to see people closest to you:
            </span>
            <button onClick={requestLocation} className="text-[11px] font-black underline text-brand">
              Retry GPS
            </button>
          </div>
        </div>
      )}

      {/* Hyperlocal Control Toolbar (Location + Radius + Quick Filters) */}
      <div className="border-b-2 border-ink bg-white dark:bg-[#121212]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          
          {/* Location Area Picker */}
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-brand text-white shrink-0 shadow-[1.5px_1.5px_0px_#121212]">
              <MapPin size={15} />
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400">
                Active Neighborhood
              </span>
              <select
                data-testid="map-area-select"
                value={selectedArea}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="cursor-pointer border-b-2 border-ink bg-transparent text-xs font-black text-ink dark:text-white outline-none"
              >
                {BENGALURU_AREAS.map((a) => (
                  <option key={a.name} value={a.name} className="text-black">
                    {a.name} ({a.zone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Radius Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-inkmuted dark:text-stone-400 mr-1 hidden sm:inline">
              Radar Radius:
            </span>
            {[
              { km: 2, label: "2 km · Walking" },
              { km: 5, label: "5 km · Nearby" },
              { km: 10, label: "10 km · Zone" },
              { km: 25, label: "All Bengaluru" },
            ].map((r) => (
              <button
                key={r.km}
                data-testid={`radius-pill-${r.km}`}
                onClick={() => setRadiusKm(r.km)}
                className={`border-2 border-ink px-2.5 py-1 text-[11px] font-black transition ${
                  radiusKm === r.km
                    ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                    : "bg-sand dark:bg-[#1e1e1e] text-ink dark:text-white hover:bg-stone/30"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex items-center min-w-[200px] sm:min-w-[240px]">
            <Search size={14} className="absolute left-2.5 text-inkmuted" />
            <input
              type="text"
              placeholder="Search skill, role, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-2 border-ink bg-white dark:bg-[#1a1a1a] py-1.5 pl-8 pr-3 text-xs font-bold text-ink dark:text-white outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* Secondary Filter Row (All / Pros / Employers / Categories) */}
      <div className="border-b-2 border-ink bg-sand/50 dark:bg-[#181818]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8">
          <div className="flex items-center gap-1.5 flex-wrap" data-testid="map-filter-row">
            {[
              { key: "all", label: `ALL PINS (${dynamicPins.length})` },
              { key: "candidate", label: `🟠 PROS (${nearbyCandidates.length})` },
              { key: "employer", label: `⬛ EMPLOYERS (${nearbyEmployers.length})` },
            ].map((f) => (
              <button
                key={f.key}
                data-testid={`map-filter-${f.key}`}
                onClick={() => setFilterType(f.key)}
                className={`border-2 border-ink px-3 py-1 text-[10px] font-black tracking-wider transition ${
                  filterType === f.key
                    ? "bg-ink text-white dark:bg-white dark:text-ink shadow-[1.5px_1.5px_0px_#E65A1E]"
                    : "bg-white dark:bg-[#222] text-ink dark:text-white hover:bg-sand"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-black">
            {["all", "Creative", "Tech", "Marketing", "Video", "Writing"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`px-2 py-0.5 border border-ink/40 transition uppercase ${
                  catFilter === cat
                    ? "bg-brand text-white border-ink font-extrabold"
                    : "bg-white dark:bg-[#222] text-inkmuted hover:text-ink"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area: Responsive Split Workspace (Map + Close By People List) */}
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Appealing Compact Google Map Viewport (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white">
                  Live Radar Map View
                </h2>
              </div>
              <span className="text-[11px] font-bold text-inkmuted dark:text-stone-400">
                Centered on <strong className="text-ink dark:text-white">{selectedArea}</strong>
              </span>
            </div>

            {/* Compact Google Map Card */}
            {loading ? (
              <div className="flex h-[460px] w-full flex-col items-center justify-center gap-3 border-2 border-ink bg-white dark:bg-[#1a1a1a]">
                <Spinner className="!h-8 !w-8 text-brand" />
                <p className="text-xs font-black uppercase tracking-wider text-inkmuted">
                  Loading Google Maps Radar...
                </p>
              </div>
            ) : (
              <GoogleMap
                pins={dynamicPins}
                center={userLocation}
                userLocation={userLocation}
                radiusKm={radiusKm < 25 ? radiusKm : null}
                selectedPinId={selectedPinId}
                onSelectPin={handleSelectPerson}
                height="460px"
              />
            )}

            {/* Map Info Bar / Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-sand/60 dark:bg-[#1e1e1e] p-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#2563EB] border-2 border-white shadow-sm" />
                  <span className="font-bold text-[11px] text-ink dark:text-white">Your Location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-brand border-2 border-ink" />
                  <span className="font-bold text-[11px] text-ink dark:text-white">Verified Freelancers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-ink border-2 border-white" />
                  <span className="font-bold text-[11px] text-ink dark:text-white">Hiring Employers</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                💡 Click any pin on the map to view instant profile details
              </span>
            </div>
          </div>

          {/* Right Column: "Close By People Around You" Interactive Feed (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b-2 border-ink pb-2">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand" />
                <h2 className="text-sm font-black uppercase tracking-wide text-ink dark:text-white">
                  People Close To You ({nearbyCandidates.length})
                </h2>
              </div>
              <span className="border border-ink bg-brand/10 dark:bg-brand/20 px-2 py-0.5 text-[9px] font-black text-brand uppercase rounded">
                ⚡ Sorted by Distance
              </span>
            </div>

            {/* Scrollable Nearby Feed */}
            <div className="flex flex-col gap-3 max-h-[510px] overflow-y-auto pr-1">
              {nearbyCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink/40 bg-sand p-8 text-center">
                  <MapPin size={28} className="text-inkmuted mb-2" />
                  <p className="text-sm font-black text-ink">No candidates within {radiusKm}km</p>
                  <p className="text-xs text-inkmuted mt-1 max-w-xs">
                    Try expanding your radar radius to 10km or selecting another neighborhood.
                  </p>
                  <button
                    onClick={() => setRadiusKm(10)}
                    className="mt-3 border-2 border-ink bg-brand px-3 py-1.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212]"
                  >
                    EXPAND TO 10 KM
                  </button>
                </div>
              ) : (
                nearbyCandidates.map((pro) => {
                  const isSelected = selectedPinId === pro.id;
                  return (
                    <div
                      key={pro.id}
                      data-testid={`nearby-candidate-${pro.id}`}
                      className={`flex flex-col gap-2.5 border-2 border-ink p-3.5 transition ${
                        isSelected
                          ? "bg-[#FFF3E9] dark:bg-[#251710] shadow-[3px_3px_0px_#E65A1E]"
                          : "bg-white dark:bg-[#1a1a1a] shadow-[2px_2px_0px_#121212] hover:translate-x-0.5"
                      }`}
                    >
                      {/* Top Row: Avatar + Name + Distance Chip */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar Initials Badge */}
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-brand text-xs font-black text-white shadow-[1px_1px_0px_#121212]">
                            {pro.title
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#10B981] border border-white" />
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-black text-ink dark:text-white">
                                {pro.title}
                              </span>
                              <CheckCircle2 size={13} className="text-brand shrink-0" />
                            </div>
                            <span className="text-[11px] font-bold text-inkmuted dark:text-stone-300">
                              {pro.subtitle.split("·")[0]}
                            </span>
                          </div>
                        </div>

                        {/* Distance Badge */}
                        <span className="shrink-0 border border-ink bg-brand px-2 py-0.5 text-[10px] font-black text-white shadow-[1px_1px_0px_#121212]">
                          ⚡ {pro.distance_km} km
                        </span>
                      </div>

                      {/* Middle: Rating + Hourly Rate */}
                      <div className="flex items-center justify-between border-t border-dashed border-ink/15 pt-2 text-xs">
                        <div className="flex items-center gap-1.5 font-extrabold text-ink dark:text-white">
                          <Star size={13} className="text-brand fill-brand" />
                          <span>{pro.rating || "4.9"}</span>
                          <span className="text-inkmuted dark:text-stone-400 font-normal">
                            (verified pro)
                          </span>
                        </div>
                        <span className="font-black text-brand">
                          ₹{pro.rate_hr || 550}/hr
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleSelectPerson(pro)}
                          className="flex items-center justify-center gap-1 border border-ink bg-sand dark:bg-[#2a2a2a] py-1.5 text-[11px] font-black text-ink dark:text-white hover:bg-stone/30 transition"
                        >
                          <Eye size={12} />
                          <span>Show on Map</span>
                        </button>
                        <button
                          onClick={() => nav(`/pro/${pro.id}`)}
                          className="flex items-center justify-center gap-1 border border-ink bg-brand py-1.5 text-[11px] font-black text-white shadow-[1.5px_1.5px_0px_#121212] hover:opacity-90 transition"
                        >
                          <span>Chat &amp; Hire</span>
                          <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Employer Mini Card Section if any */}
            {nearbyEmployers.length > 0 && (
              <div className="mt-2 border-2 border-ink bg-ink text-white p-3 shadow-[2px_2px_0px_#E65A1E]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-brand" />
                    <span className="text-xs font-black uppercase">
                      {nearbyEmployers.length} Hiring Companies Near You
                    </span>
                  </div>
                  <Link
                    to="/freelancer/jobs"
                    className="text-[10px] font-black text-brand underline uppercase hover:text-white"
                  >
                    Browse Jobs →
                  </Link>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </Shell>
  );
}
