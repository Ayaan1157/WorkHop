import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Navigation, LocateFixed, AlertCircle, Search, Sparkles, MapPin,
  Users, Briefcase, Star, ArrowUpRight, CheckCircle2, Eye,
  Building2, SlidersHorizontal, Send, ChevronRight
} from "lucide-react";
import { Shell, TopBar, Spinner } from "@/components/kit";
import GoogleMap from "@/components/GoogleMap";
import { useUserLocation, distanceKm } from "@/hooks/useUserLocation";
import {
  BENGALURU_AREAS,
  findNearestArea,
  getAreaCoordinates,
  getOrganicCoordinates,
  getProximityCoordinates,
} from "@/lib/locationAreas";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";
import FALLBACK_LEADS from "@/data/leads.json";
import FALLBACK_JOBS from "@/data/jobs.json";
import { matchLeadToTaxonomy, matchJobToTaxonomy } from "@/lib/keywordTaxonomy";

export default function LiveMap() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { coords: gpsCoords, status: locStatus, requestLocation } = useUserLocation();

  // Role Exploration Mode: "employer" (Show Freelancers) vs "freelancer" (Show Open Gigs)
  const initialMode = useMemo(() => {
    const savedRole = localStorage.getItem("workhop_auth_role") || user?.role;
    if (savedRole === "freelancer" || savedRole === "candidate") return "freelancer";
    return "employer";
  }, [user]);

  const [viewMode, setViewMode] = useState(initialMode); // "employer" | "freelancer"

  const [leads, setLeads] = useState(FALLBACK_LEADS);
  const [jobs, setJobs] = useState(FALLBACK_JOBS);
  const [loading, setLoading] = useState(true);

  // Active Location: GPS coords or chosen named Bengaluru area
  const [selectedArea, setSelectedArea] = useState("Koramangala");
  const [userLocation, setUserLocation] = useState({ lat: 12.9352, lng: 77.6245 }); // Default Koramangala
  const [radiusKm, setRadiusKm] = useState(5); // 2, 5, 10, 25 (all)

  // Filters & State
  const [catFilter, setCatFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [mobileTab, setMobileTab] = useState("map"); // "map" | "list" for mobile viewports

  // Auto-request location on mount to center around closest real location
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

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

  // Fetch Live Leads & Gigs from API with fallback
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet("/leads").catch(() => null),
      apiGet("/jobs").catch(() => null),
    ])
      .then(([leadsData, jobsData]) => {
        if (leadsData && Array.isArray(leadsData) && leadsData.length > 0) {
          setLeads(leadsData);
        }
        if (jobsData && Array.isArray(jobsData) && jobsData.length > 0) {
          setJobs(jobsData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute organic coordinates and dynamic distances for Freelancers (Leads)
  // Ensures freelancers are distributed organically around active location starting from closest
  const processedFreelancers = useMemo(() => {
    const activeLoc = userLocation || { lat: 12.9352, lng: 77.6245 };
    return leads.map((l, idx) => {
      const organicCoords = getProximityCoordinates(
        activeLoc.lat,
        activeLoc.lng,
        l.distance_km || (0.3 + (idx % 15) * 0.25),
        l.id || `lead-${idx}`
      );

      const dist = distanceKm(activeLoc, organicCoords);
      return {
        id: String(l.id || `lead-${idx}`),
        kind: "candidate",
        name: l.name,
        skill: l.skill,
        rating: l.rating || 4.9,
        rate_hr: l.rate_hr || (l.rate ? parseInt(l.rate) : 550),
        bucket: l.bucket || l.category || "Creative",
        category: l.category || l.bucket || "Creative",
        phone: l.phone,
        portfolio: l.portfolio,
        lat: organicCoords.lat,
        lng: organicCoords.lng,
        distance_km: Math.round(dist * 10) / 10,
      };
    });
  }, [leads, userLocation]);

  // Compute organic coordinates and dynamic distances for Open Gigs (Jobs)
  const processedJobs = useMemo(() => {
    const activeLoc = userLocation || { lat: 12.9352, lng: 77.6245 };
    return jobs.map((j, idx) => {
      const organicCoords = getProximityCoordinates(
        activeLoc.lat,
        activeLoc.lng,
        j.distance_km || (0.4 + (idx % 15) * 0.3),
        j.id || `job-${idx}`
      );

      const dist = distanceKm(activeLoc, organicCoords);
      return {
        id: String(j.id || `job-${idx}`),
        kind: "job",
        title: j.title,
        company_name: j.company_name || j.employer_name?.split("·")[1]?.trim() || "WorkHop Partner",
        employer_name: j.employer_name || "Verified Employer",
        pay: j.pay || 15000,
        bucket: j.bucket || "Creative",
        category: j.category || "General",
        description: j.description || "Exciting gig opportunity with immediate onboarding.",
        area: j.area || selectedArea || "Bengaluru",
        lat: organicCoords.lat,
        lng: organicCoords.lng,
        distance_km: Math.round(dist * 10) / 10,
      };
    });
  }, [jobs, userLocation, selectedArea]);

  // Filter Freelancers based on Radius, Category, and Search
  const filteredFreelancers = useMemo(() => {
    let list = processedFreelancers;
    if (radiusKm && radiusKm < 25) {
      list = list.filter((f) => (f.distance_km ?? 0) <= radiusKm);
    }
    if (catFilter !== "all") {
      const c = catFilter.toLowerCase();
      list = list.filter(
        (f) =>
          f.bucket?.toLowerCase().includes(c) ||
          f.category?.toLowerCase().includes(c) ||
          f.skill?.toLowerCase().includes(c)
      );
    }
    if (searchQuery.trim()) {
      list = list.filter((f) => matchLeadToTaxonomy(f, searchQuery));
    }
    return list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  }, [processedFreelancers, radiusKm, catFilter, searchQuery]);

  // Filter Jobs based on Radius, Category, and Search
  const filteredJobs = useMemo(() => {
    let list = processedJobs;
    if (radiusKm && radiusKm < 25) {
      list = list.filter((j) => (j.distance_km ?? 0) <= radiusKm);
    }
    if (catFilter !== "all") {
      const c = catFilter.toLowerCase();
      list = list.filter(
        (j) =>
          j.bucket?.toLowerCase().includes(c) ||
          j.category?.toLowerCase().includes(c) ||
          j.title?.toLowerCase().includes(c)
      );
    }
    if (searchQuery.trim()) {
      list = list.filter((j) => matchJobToTaxonomy(j, searchQuery));
    }
    return list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
  }, [processedJobs, radiusKm, catFilter, searchQuery]);

  // Active Map Pins depending on viewMode
  const activePins = useMemo(() => {
    if (viewMode === "employer") {
      // Show Freelancers to Employers
      return filteredFreelancers.map((f) => ({
        id: f.id,
        kind: "candidate",
        title: f.name,
        subtitle: `${f.skill} · ${f.distance_km} km away`,
        lat: f.lat,
        lng: f.lng,
        distance_km: f.distance_km,
        rating: f.rating,
        rate_hr: f.rate_hr,
        category: f.bucket,
      }));
    } else {
      // Show Open Gigs to Freelancers
      return filteredJobs.map((j) => ({
        id: j.id,
        kind: "job",
        title: j.title,
        subtitle: `${j.company_name} · ${j.distance_km} km away`,
        company_name: j.company_name,
        pay: j.pay,
        lat: j.lat,
        lng: j.lng,
        distance_km: j.distance_km,
        category: j.category,
      }));
    }
  }, [viewMode, filteredFreelancers, filteredJobs]);

  const handleSelectPin = (item) => {
    setSelectedPinId(item.id);
    if (item.lat && item.lng) {
      setUserLocation({ lat: item.lat, lng: item.lng });
    }
    setMobileTab("map");
  };

  return (
    <Shell>
      <TopBar
        title={
          viewMode === "employer"
            ? "GOOGLE LIVE MAP · FIND FREELANCERS"
            : "GOOGLE LIVE MAP · FIND OPEN GIGS"
        }
        sub={
          viewMode === "employer"
            ? `Radar active: ${filteredFreelancers.length} verified pros within ${radiusKm < 25 ? `${radiusKm}km` : "Bengaluru"}`
            : `Radar active: ${filteredJobs.length} open gigs within ${radiusKm < 25 ? `${radiusKm}km` : "Bengaluru"}`
        }
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
              GPS permission is disabled. Select your Bengaluru area below to see results closest to you:
            </span>
            <button onClick={requestLocation} className="text-[11px] font-black underline text-brand">
              Retry GPS
            </button>
          </div>
        </div>
      )}

      {/* DUAL ROLE EXPLORATION MODE SWITCHER (Hiring vs Freelancer) */}
      <div className="border-b-2 border-ink bg-white dark:bg-[#121212] px-3 py-2.5 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col sm:flex-row items-center justify-between gap-2.5">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 hidden sm:inline">
              Map View Mode:
            </span>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full sm:w-auto">
              {/* Option 1: I'm Hiring (Show Freelancers) */}
              <button
                data-testid="mode-employer-btn"
                onClick={() => {
                  setViewMode("employer");
                  setSelectedPinId(null);
                }}
                className={`flex h-10 items-center justify-center gap-1.5 sm:gap-2 border-2 border-ink px-3 sm:px-4 text-[11px] sm:text-xs font-black transition ${
                  viewMode === "employer"
                    ? "bg-brand text-white shadow-[2px_2px_0px_#121212] -translate-y-0.5"
                    : "bg-sand dark:bg-[#1f1f1f] text-ink dark:text-white hover:bg-stone/20"
                }`}
              >
                <span>🏢</span>
                <span className="hidden xs:inline sm:hidden">HIRING</span>
                <span className="hidden sm:inline">I'M HIRING (PROS)</span>
                <span className="xs:hidden">HIRING</span>
              </button>

              {/* Option 2: I'm a Freelancer (Show Open Gigs) */}
              <button
                data-testid="mode-freelancer-btn"
                onClick={() => {
                  setViewMode("freelancer");
                  setSelectedPinId(null);
                }}
                className={`flex h-10 items-center justify-center gap-1.5 sm:gap-2 border-2 border-ink px-3 sm:px-4 text-[11px] sm:text-xs font-black transition ${
                  viewMode === "freelancer"
                    ? "bg-[#059669] text-white shadow-[2px_2px_0px_#121212] -translate-y-0.5"
                    : "bg-sand dark:bg-[#1f1f1f] text-ink dark:text-white hover:bg-stone/20"
                }`}
              >
                <span>💼</span>
                <span className="hidden xs:inline sm:hidden">GIGS</span>
                <span className="hidden sm:inline">I'M A FREELANCER (GIGS)</span>
                <span className="xs:hidden">GIGS</span>
              </button>
            </div>
          </div>

          {/* Quick Context Pill */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <span
              className={`flex h-10 items-center justify-center w-full sm:w-auto text-center border-2 border-ink px-3.5 text-[11px] sm:text-xs font-black uppercase shadow-[1.5px_1.5px_0px_#121212] ${
                viewMode === "employer"
                  ? "bg-[#FFF3E9] text-brand dark:bg-[#251710] dark:!text-white"
                  : "bg-[#E6F4EA] text-[#059669] dark:bg-[#11291E] dark:!text-white"
              }`}
            >
              {viewMode === "employer"
                ? `👤 ${filteredFreelancers.length} Freelancer Profiles Near You`
                : `💼 ${filteredJobs.length} Open Job Postings Near You`}
            </span>
          </div>

        </div>
      </div>

      {/* Hyperlocal Control Toolbar (Location + Radius + Search) */}
      <div className="border-b-2 border-ink bg-sand/60 dark:bg-[#181818]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-3 py-2.5 sm:px-8">
          
          <div className="flex items-center justify-between sm:justify-start gap-3 flex-wrap">
            {/* Location Area Picker */}
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-brand text-white shrink-0 shadow-[1.5px_1.5px_0px_#121212]">
                <MapPin size={15} />
              </span>
              <div className="flex flex-col justify-center h-9">
                <span className="text-[9px] font-black uppercase tracking-wider text-inkmuted dark:text-stone-400 leading-none mb-0.5">
                  Active Area
                </span>
                <select
                  data-testid="map-area-select"
                  value={selectedArea}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  className="cursor-pointer border-b-2 border-ink bg-transparent text-xs font-black text-ink dark:text-white outline-none leading-none"
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { km: 2, label: "2 km" },
                { km: 5, label: "5 km" },
                { km: 10, label: "10 km" },
                { km: 25, label: "All BLR" },
              ].map((r) => (
                <button
                  key={r.km}
                  data-testid={`radius-pill-${r.km}`}
                  onClick={() => setRadiusKm(r.km)}
                  className={`flex h-9 items-center justify-center border-2 border-ink px-3 text-xs font-black whitespace-nowrap transition ${
                    radiusKm === r.km
                      ? "bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]"
                      : "bg-white dark:bg-[#222] text-ink dark:text-white hover:bg-stone/20"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center w-full sm:w-auto min-w-[200px] sm:min-w-[260px]">
            <Search size={14} className="absolute left-2.5 text-inkmuted pointer-events-none" />
            <input
              type="text"
              placeholder={
                viewMode === "employer"
                  ? "Search pros — e.g. AutoCAD, Framer, Zomato, Kannada VO..."
                  : "Search gigs — e.g. AutoCAD, Framer, Zomato, Kannada VO..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full items-center border-2 border-ink bg-white dark:bg-[#1a1a1a] pl-8 pr-3 text-xs font-bold text-ink dark:text-white outline-none focus:border-brand shadow-[1.5px_1.5px_0px_#121212]"
            />
          </div>
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="border-b-2 border-ink bg-white dark:bg-[#141414]">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-1.5 overflow-x-auto px-3 py-2 sm:px-8 text-[10px] font-black">
          <span className="text-inkmuted dark:text-stone-400 mr-1 uppercase whitespace-nowrap hidden xs:inline">Filter:</span>
          {["all", "Creative", "Tech", "Marketing", "Video", "Writing"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`flex h-8 items-center justify-center px-3 border-2 border-ink transition uppercase whitespace-nowrap text-xs font-black ${
                catFilter === cat
                  ? "bg-ink text-white dark:bg-brand dark:!text-white shadow-[1.5px_1.5px_0px_#E65A1E]"
                  : "bg-sand/60 dark:bg-[#222] text-ink dark:!text-white hover:bg-sand"
              }`}
            >
              {cat === "all" ? "ALL" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Segmented View Switcher (Radar Map vs Feed) */}
      <div className="lg:hidden mx-auto w-full max-w-[1600px] px-3 pt-3">
        <div className="grid grid-cols-2 gap-1.5 border-2 border-ink bg-sand/70 dark:bg-[#1a1a1a] p-1.5 shadow-[2px_2px_0px_#121212]">
          <button
            type="button"
            data-testid="mobile-tab-map"
            onClick={() => setMobileTab("map")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-black uppercase transition border-2 ${
              mobileTab === "map"
                ? "bg-brand text-white border-ink shadow-[1.5px_1.5px_0px_#121212]"
                : "bg-white dark:bg-[#252525] text-ink dark:text-white border-transparent hover:bg-white/80"
            }`}
          >
            <span>🗺️</span>
            <span>Radar Map</span>
          </button>
          <button
            type="button"
            data-testid="mobile-tab-list"
            onClick={() => setMobileTab("list")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-black uppercase transition border-2 ${
              mobileTab === "list"
                ? "bg-brand text-white border-ink shadow-[1.5px_1.5px_0px_#121212]"
                : "bg-white dark:bg-[#252525] text-ink dark:text-white border-transparent hover:bg-white/80"
            }`}
          >
            <span>📋</span>
            <span>
              Feed ({viewMode === "employer" ? filteredFreelancers.length : filteredJobs.length})
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Responsive Split Workspace (Map + Side Feed) */}
      <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          
          {/* Left Column: Appealing Compact Google Map Viewport (7 Cols) */}
          <div className={`lg:col-span-7 flex-col gap-3 ${mobileTab === "map" ? "flex" : "hidden lg:flex"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-2.5 w-2.5 rounded-full animate-pulse ${
                    viewMode === "employer" ? "bg-brand" : "bg-[#059669]"
                  }`}
                />
                <h2 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white">
                  {viewMode === "employer"
                    ? `Live Map · ${filteredFreelancers.length} Freelancers in ${selectedArea}`
                    : `Live Map · ${filteredJobs.length} Job Postings in ${selectedArea}`}
                </h2>
              </div>
              <span className="text-[11px] font-bold text-inkmuted dark:text-stone-400">
                Centered on <strong className="text-ink dark:text-white">{selectedArea}</strong>
              </span>
            </div>

            {/* Compact Google Map Card */}
            {loading ? (
              <div className="flex h-[360px] sm:h-[470px] w-full flex-col items-center justify-center gap-3 border-2 border-ink bg-white dark:bg-[#1a1a1a]">
                <Spinner className="!h-8 !w-8 text-brand" />
                <p className="text-xs font-black uppercase tracking-wider text-inkmuted">
                  Loading Google Maps Radar...
                </p>
              </div>
            ) : (
              <GoogleMap
                pins={activePins}
                center={userLocation}
                userLocation={userLocation}
                radiusKm={radiusKm}
                onRadiusChange={(newRad) => setRadiusKm(newRad)}
                selectedPinId={selectedPinId}
                onSelectPin={handleSelectPin}
                height="470px"
              />
            )}

            {/* Map Info Bar / Dynamic Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-sand/60 dark:bg-[#1e1e1e] p-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#2563EB] border-2 border-white shadow-sm" />
                  <span className="font-bold text-[11px] text-ink dark:text-white">Your Location</span>
                </div>
                {viewMode === "employer" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-brand border-2 border-ink" />
                    <span className="font-bold text-[11px] text-ink dark:text-white">
                      Verified Freelancers (👤 Click pin for profile)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#059669] border-2 border-ink" />
                    <span className="font-bold text-[11px] text-ink dark:text-white">
                      Open Job Gigs (💼 Click pin to apply)
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-inkmuted dark:text-stone-400">
                ⚡ Deterministically scattered — no overlapping markers
              </span>
            </div>
          </div>

          {/* Right Column: "Close By People / Open Gigs" Interactive Feed (5 Cols) */}
          <div className={`lg:col-span-5 flex-col gap-3 ${mobileTab === "list" ? "flex" : "hidden lg:flex"}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-ink pb-2">
              <div className="flex items-center gap-2">
                {viewMode === "employer" ? (
                  <>
                    <Users size={16} className="text-brand" />
                    <h2 className="text-sm font-black uppercase tracking-wide text-ink dark:text-white">
                      Freelancers Around You ({filteredFreelancers.length})
                    </h2>
                  </>
                ) : (
                  <>
                    <Briefcase size={16} className="text-[#059669]" />
                    <h2 className="text-sm font-black uppercase tracking-wide text-ink dark:text-white">
                      Open Gigs Around You ({filteredJobs.length})
                    </h2>
                  </>
                )}
              </div>
              <span className="border border-ink bg-sand dark:bg-[#252525] px-2 py-0.5 text-[9px] font-black text-ink dark:text-white uppercase rounded">
                ⚡ Sorted by Distance
              </span>
            </div>

            {/* Scrollable Feed */}
            <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1">
              
              {/* EMPLOYER MODE: Show Freelancer Cards */}
              {viewMode === "employer" && (
                filteredFreelancers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink/40 bg-sand p-8 text-center">
                    <MapPin size={28} className="text-inkmuted mb-2" />
                    <p className="text-sm font-black text-ink">No freelancers within {radiusKm}km</p>
                    <p className="text-xs text-inkmuted mt-1 max-w-xs">
                      Try expanding radar radius to 10km or selecting another neighborhood.
                    </p>
                    <button
                      onClick={() => setRadiusKm(10)}
                      className="mt-3 border-2 border-ink bg-brand px-3 py-1.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212]"
                    >
                      EXPAND TO 10 KM
                    </button>
                  </div>
                ) : (
                  filteredFreelancers.map((pro) => {
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
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-brand text-xs font-black text-white shadow-[1px_1px_0px_#121212]">
                              {pro.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#10B981] border border-white" />
                            </div>

                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs sm:text-sm font-black text-ink dark:text-white">
                                  {pro.name}
                                </span>
                                <CheckCircle2 size={13} className="text-brand shrink-0" />
                              </div>
                              <span className="text-[11px] font-bold text-inkmuted dark:text-stone-300">
                                {pro.skill}
                              </span>
                            </div>
                          </div>

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
                              ({pro.bucket})
                            </span>
                          </div>
                          <span className="font-black text-brand">
                            ₹{pro.rate_hr || 550}/hr
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleSelectPin(pro)}
                            className="flex items-center justify-center gap-1 border border-ink bg-sand dark:bg-[#2a2a2a] py-1.5 text-[11px] font-black text-ink dark:text-white hover:bg-stone/30 transition"
                          >
                            <Eye size={12} />
                            <span>Show on Map</span>
                          </button>
                          <button
                            onClick={() => {
                              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                              nav(`/pro/${pro.id}`);
                            }}
                            className="flex items-center justify-center gap-1 border border-ink bg-brand py-1.5 text-[11px] font-black text-white shadow-[1.5px_1.5px_0px_#121212] hover:opacity-90 transition"
                          >
                            <span>Chat &amp; Hire</span>
                            <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {/* FREELANCER MODE: Show Open Gig Cards */}
              {viewMode === "freelancer" && (
                filteredJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink/40 bg-sand p-8 text-center">
                    <Briefcase size={28} className="text-inkmuted mb-2" />
                    <p className="text-sm font-black text-ink">No open gigs within {radiusKm}km</p>
                    <p className="text-xs text-inkmuted mt-1 max-w-xs">
                      Try expanding radar radius to 10km or selecting another neighborhood.
                    </p>
                    <button
                      onClick={() => setRadiusKm(10)}
                      className="mt-3 border-2 border-ink bg-[#059669] px-3 py-1.5 text-xs font-black text-white shadow-[2px_2px_0px_#121212]"
                    >
                      EXPAND TO 10 KM
                    </button>
                  </div>
                ) : (
                  filteredJobs.map((gig) => {
                    const isSelected = selectedPinId === gig.id;
                    return (
                      <div
                        key={gig.id}
                        data-testid={`nearby-gig-${gig.id}`}
                        className={`flex flex-col gap-2.5 border-2 border-ink p-3.5 transition ${
                          isSelected
                            ? "bg-[#E6F4EA] dark:bg-[#11291E] shadow-[3px_3px_0px_#059669]"
                            : "bg-white dark:bg-[#1a1a1a] shadow-[2px_2px_0px_#121212] hover:translate-x-0.5"
                        }`}
                      >
                        {/* Top Row: Company + Pay Badge + Distance */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-[#059669] text-white text-xs font-black shadow-[1px_1px_0px_#121212]">
                              💼
                            </span>
                            <div className="flex flex-col">
                              <span className="text-xs sm:text-sm font-black text-ink dark:text-white line-clamp-1">
                                {gig.title}
                              </span>
                              <span className="text-[11px] font-bold text-inkmuted dark:text-stone-300">
                                🏢 {gig.company_name} · {gig.area}
                              </span>
                            </div>
                          </div>

                          <span className="shrink-0 border border-ink bg-[#059669] px-2 py-0.5 text-[10px] font-black text-white shadow-[1px_1px_0px_#121212]">
                            ⚡ {gig.distance_km} km
                          </span>
                        </div>

                        {/* Description Snippet */}
                        <p className="text-[11px] text-inkmuted dark:text-stone-300 line-clamp-2 leading-relaxed">
                          {gig.description}
                        </p>

                        {/* Budget + Category */}
                        <div className="flex items-center justify-between border-t border-dashed border-ink/15 pt-2 text-xs">
                          <div className="flex items-center gap-1 text-[11px] font-extrabold text-ink dark:text-white">
                            <span className="border border-ink bg-sand dark:bg-[#333] px-1.5 py-0.5 text-[10px]">
                              {gig.category}
                            </span>
                          </div>
                          <span className="font-black text-[#059669] text-sm">
                            ₹{Number(gig.pay).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleSelectPin(gig)}
                            className="flex items-center justify-center gap-1 border border-ink bg-sand dark:bg-[#2a2a2a] py-1.5 text-[11px] font-black text-ink dark:text-white hover:bg-stone/30 transition"
                          >
                            <Eye size={12} />
                            <span>Show on Map</span>
                          </button>
                          <Link
                            to="/freelancer/jobs"
                            className="flex items-center justify-center gap-1 border border-ink bg-[#059669] py-1.5 text-[11px] font-black text-white shadow-[1.5px_1.5px_0px_#121212] hover:opacity-90 transition text-center"
                          >
                            <span>Apply Now</span>
                            <ArrowUpRight size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )
              )}

            </div>

            {/* Bottom Quick Switch Banner */}
            <div className="mt-2 border-2 border-ink bg-[#121212] dark:bg-[#161618] text-white p-3 shadow-[2px_2px_0px_#E65A1E]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-brand" />
                  <span className="text-xs font-black uppercase">
                    {viewMode === "employer"
                      ? "Are you looking for work instead?"
                      : "Are you hiring freelancers instead?"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setViewMode(viewMode === "employer" ? "freelancer" : "employer");
                    setSelectedPinId(null);
                  }}
                  className="text-[10px] font-black text-brand underline uppercase hover:text-white"
                >
                  Switch Mode →
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Shell>
  );
}
