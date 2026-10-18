import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Mail,
  Copy,
  Download,
  Search,
  RefreshCw,
  Trash2,
  Check,
  Building2,
  User,
  Sparkles,
  ExternalLink,
  Send,
  AlertCircle,
  Filter,
} from "lucide-react";

export default function CityWaitlistTab({ adminFetch }) {
  const [data, setData] = useState({ total: 0, by_city: [], entries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(null);

  const fetchWaitlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/admin/city-waitlist");
      if (res) {
        setData({
          total: res.total || (res.entries ? res.entries.length : 0),
          by_city: res.by_city || [],
          entries: res.entries || [],
        });
      }
    } catch (err) {
      setError(err?.message || "Failed to load city waitlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (entryId) => {
    if (!window.confirm("Are you sure you want to remove this email from the waitlist?")) {
      return;
    }
    try {
      await adminFetch(`/admin/city-waitlist/${entryId}`, "DELETE");
      setData((prev) => ({
        ...prev,
        entries: prev.entries.filter((e) => e.waitlist_id !== entryId && e.id !== entryId),
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err) {
      alert(err?.message || "Failed to delete entry");
    }
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return (data.entries || []).filter((entry) => {
      const email = (entry.email || entry.contact || "").toLowerCase();
      const city = (entry.city || "").toLowerCase();
      const note = (entry.note || "").toLowerCase();
      const role = (entry.role || "user").toLowerCase();

      const q = search.toLowerCase().trim();
      const matchesSearch = !q || email.includes(q) || city.includes(q) || note.includes(q);
      const matchesCity = selectedCity === "ALL" || city === selectedCity.toLowerCase();
      const matchesRole = selectedRole === "ALL" || role === selectedRole.toLowerCase();

      return matchesSearch && matchesCity && matchesRole;
    });
  }, [data.entries, search, selectedCity, selectedRole]);

  // Extract all valid emails for quick copying
  const allEmails = useMemo(() => {
    return filteredEntries
      .map((e) => (e.email || e.contact || "").trim())
      .filter((e) => e && e.includes("@"));
  }, [filteredEntries]);

  // Copy all emails comma separated
  const handleCopyAllEmails = () => {
    if (allEmails.length === 0) return;
    const text = allEmails.join(", ");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Copy individual email
  const handleCopySingle = (email) => {
    navigator.clipboard.writeText(email);
    setCopiedSingle(email);
    setTimeout(() => setCopiedSingle(null), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredEntries || filteredEntries.length === 0) {
      alert("No entries to export.");
      return;
    }

    const headers = ["Email", "City", "Role", "Note", "Registered At"];
    const rows = filteredEntries.map((e) => [
      `"${(e.email || e.contact || "").replace(/"/g, '""')}"`,
      `"${(e.city || "").replace(/"/g, '""')}"`,
      `"${(e.role || "user").replace(/"/g, '""')}"`,
      `"${(e.note || "").replace(/"/g, '""')}"`,
      `"${e.created_at || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `workhop_outside_bengaluru_waitlist_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unique cities list for dropdown
  const uniqueCities = useMemo(() => {
    const set = new Set();
    (data.entries || []).forEach((e) => {
      if (e.city) set.add(e.city);
    });
    return Array.from(set).sort();
  }, [data.entries]);

  const topCity = data.by_city && data.by_city.length > 0 ? data.by_city[0] : null;

  const roleCounts = useMemo(() => {
    let employers = 0;
    let freelancers = 0;
    (data.entries || []).forEach((e) => {
      if (e.role === "employer") employers++;
      else if (e.role === "freelancer") freelancers++;
    });
    return { employers, freelancers };
  }, [data.entries]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="border-2 border-ink bg-[#FFF4EB] p-5 shadow-[4px_4px_0px_#121212]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-brand text-white shadow-[1.5px_1.5px_0px_#121212]">
                <MapPin size={16} />
              </span>
              <h2 className="text-base font-black uppercase tracking-wider text-ink">
                Outside Bengaluru Waitlist &amp; Expansion CRM
              </h2>
              <span className="border border-ink bg-white px-2 py-0.5 text-[10px] font-black uppercase text-brand shadow-[1px_1px_0px_#121212]">
                Geo-Fence Leads
              </span>
            </div>
            <p className="text-xs text-inkmuted font-semibold max-w-2xl leading-relaxed">
              When visitors access WorkHop from outside Bengaluru (e.g. Mysore, Mangalore, Hubli), they see a <em>"Sorry! We'll be in your city soon"</em> modal and submit their email. All captured emails are logged here so you can broadcast city launch announcements and prioritize city expansions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <button
              onClick={fetchWaitlist}
              disabled={loading}
              className="flex items-center gap-1.5 border-2 border-ink bg-white px-3 py-2 text-xs font-black uppercase text-ink shadow-[2px_2px_0px_#121212] hover:bg-sand transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              className="flex items-center gap-1.5 border-2 border-ink bg-[#E5F7E0] px-3.5 py-2 text-xs font-black uppercase text-ink shadow-[2px_2px_0px_#121212] hover:bg-[#D4EED0] transition disabled:opacity-50"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
          <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted">Total Email Leads</p>
          <p className="text-2xl font-black text-ink mt-1">{data.total}</p>
          <p className="text-[10px] font-bold text-inkmuted mt-0.5">Outside BLR visitors</p>
        </div>

        <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
          <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted">#1 Demand City</p>
          <p className="text-2xl font-black text-brand mt-1 truncate">
            {topCity ? topCity.city : "None"}
          </p>
          <p className="text-[10px] font-bold text-inkmuted mt-0.5">
            {topCity ? `${topCity.count} waitlist signups` : "Awaiting data"}
          </p>
        </div>

        <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
          <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted">Cities Represented</p>
          <p className="text-2xl font-black text-ink mt-1">{uniqueCities.length}</p>
          <p className="text-[10px] font-bold text-inkmuted mt-0.5">Across Karnataka &amp; beyond</p>
        </div>

        <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212]">
          <p className="text-[10px] font-black uppercase tracking-wider text-inkmuted">Audience Split</p>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-black">
            <span className="flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5">
              <Building2 size={11} /> {roleCounts.employers} Clients
            </span>
            <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5">
              <User size={11} /> {roleCounts.freelancers} Pros
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmuted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, city name, or notes..."
              className="w-full border-2 border-ink pl-9 pr-3 py-2 text-xs font-bold text-ink outline-none focus:bg-sand/30"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 border-2 border-ink bg-sand/30 px-2.5 py-1.5 text-xs font-bold">
              <Filter size={12} className="text-inkmuted" />
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent font-black text-xs text-ink outline-none cursor-pointer"
              >
                <option value="ALL">All Cities ({data.entries.length})</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 border-2 border-ink bg-sand/30 px-2.5 py-1.5 text-xs font-bold">
              <span className="text-[10px] font-black uppercase tracking-wider text-inkmuted">Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-transparent font-black text-xs text-ink outline-none cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="employer">Hiring Clients</option>
                <option value="freelancer">Freelancers</option>
                <option value="user">General</option>
              </select>
            </div>

            {/* Copy All Emails Button */}
            <button
              onClick={handleCopyAllEmails}
              disabled={allEmails.length === 0}
              className={`flex items-center gap-1.5 border-2 border-ink px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_#121212] transition ${
                copiedAll
                  ? "bg-emerald-500 text-white"
                  : "bg-brand text-white hover:bg-brand/90"
              } disabled:opacity-50`}
              title="Copy all comma-separated emails to clipboard for BCC / email blast"
            >
              {copiedAll ? <Check size={14} /> : <Copy size={14} />}
              <span>
                {copiedAll
                  ? `✓ Copied ${allEmails.length} Emails!`
                  : `Copy ${allEmails.length} Emails`}
              </span>
            </button>

            {/* Direct Mailto Blast */}
            {allEmails.length > 0 && (
              <a
                href={`mailto:team@workhop.in?bcc=${encodeURIComponent(allEmails.join(","))}&subject=${encodeURIComponent(
                  "WorkHop is expanding to your city soon!"
                )}&body=${encodeURIComponent(
                  "Hello,\n\nThank you for expressing interest in WorkHop! We are preparing to launch in your area.\n\nBest,\nThe WorkHop Team"
                )}`}
                className="flex items-center gap-1.5 border-2 border-ink bg-white px-3 py-2 text-xs font-black uppercase text-ink shadow-[2px_2px_0px_#121212] hover:bg-sand transition"
                title="Open default email client with all contacts in BCC"
              >
                <Send size={13} className="text-brand" />
                <span>BCC Mailto Blast</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 4. Table of Captured Emails */}
      <div className="border-2 border-ink bg-white shadow-[4px_4px_0px_#121212] overflow-hidden">
        <div className="border-b-2 border-ink bg-sand/40 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink">
              Captured Waitlist Inquiries ({filteredEntries.length})
            </span>
            {selectedCity !== "ALL" && (
              <span className="bg-brand text-white text-[10px] font-black px-1.5 py-0.5">
                City: {selectedCity}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-inkmuted">
            Click any email to copy or email directly
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-xs font-bold border-b-2 border-red-200 flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <MapPin size={32} className="mx-auto text-inkmuted" />
            <p className="text-sm font-black text-ink">No waitlist entries found</p>
            <p className="text-xs text-inkmuted font-semibold">
              {search || selectedCity !== "ALL" || selectedRole !== "ALL"
                ? "Try adjusting your search query or filter options."
                : "Users outside Bengaluru will appear here as soon as they submit their email."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-ink bg-sand/20 text-ink uppercase tracking-wider text-[10px] font-black">
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Email Address</th>
                  <th className="py-2.5 px-4">Detected City</th>
                  <th className="py-2.5 px-4">Interest / Role</th>
                  <th className="py-2.5 px-4">Notes / Requirement</th>
                  <th className="py-2.5 px-4">Date Joined</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-ink/20 font-bold">
                {filteredEntries.map((entry, idx) => {
                  const email = entry.email || entry.contact || "—";
                  const city = entry.city || "Mysore";
                  const role = entry.role || "user";
                  const entryId = entry.waitlist_id || entry.id || `wl-${idx}`;

                  return (
                    <tr
                      key={entryId}
                      className="hover:bg-sand/20 transition-colors group"
                    >
                      <td className="py-3 px-4 text-inkmuted text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-ink">{email}</span>
                          <button
                            onClick={() => handleCopySingle(email)}
                            className="text-inkmuted hover:text-brand transition opacity-0 group-hover:opacity-100"
                            title="Copy email"
                          >
                            {copiedSingle === email ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 border border-ink bg-[#FFF3C4] px-2 py-0.5 text-[11px] font-black text-ink uppercase shadow-[1px_1px_0px_#121212]">
                          <MapPin size={10} className="text-brand fill-brand" />
                          <span>{city}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {role === "employer" ? (
                          <span className="inline-flex items-center gap-1 border border-blue-400 bg-blue-50 text-blue-800 px-2 py-0.5 text-[10px] font-black uppercase">
                            <Building2 size={10} /> Client (Hiring)
                          </span>
                        ) : role === "freelancer" ? (
                          <span className="inline-flex items-center gap-1 border border-green-400 bg-green-50 text-green-800 px-2 py-0.5 text-[10px] font-black uppercase">
                            <User size={10} /> Freelancer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border border-stone-300 bg-stone-100 text-stone-700 px-2 py-0.5 text-[10px] font-black uppercase">
                            General
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-inkmuted font-medium max-w-xs truncate">
                        {entry.note ? (
                          <span title={entry.note}>{entry.note}</span>
                        ) : (
                          <span className="italic text-inkmuted/60">No custom note</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-inkmuted text-[11px] whitespace-nowrap">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
                              `WorkHop expansion update for ${city}`
                            )}&body=${encodeURIComponent(
                              `Hi,\n\nThank you for joining the WorkHop launch waitlist for ${city}!\n\nBest,\nThe WorkHop Team`
                            )}`}
                            className="flex items-center gap-1 border border-ink bg-white px-2 py-1 text-[11px] font-black text-ink hover:bg-sand transition shadow-[1px_1px_0px_#121212]"
                            title="Direct email via email client"
                          >
                            <Mail size={11} className="text-brand" />
                            <span>Email</span>
                          </a>

                          <button
                            onClick={() => handleDelete(entryId)}
                            className="flex items-center justify-center h-6 w-6 border border-ink bg-red-50 text-red-700 hover:bg-red-100 transition shadow-[1px_1px_0px_#121212]"
                            title="Remove entry"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. City Breakdown Summary */}
      {data.by_city && data.by_city.length > 0 && (
        <div className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_#121212] space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-brand fill-brand" />
            <h3 className="text-xs font-black uppercase tracking-wider text-ink">
              Geographic Expansion Demand Breakdown
            </h3>
          </div>
          <p className="text-[11px] text-inkmuted font-semibold">
            Cities with the most signups indicate the strongest immediate demand for WorkHop's next phase of physical expansion:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
            {data.by_city.map((c) => (
              <button
                key={c.city}
                type="button"
                onClick={() => setSelectedCity(c.city)}
                className={`border-2 border-ink p-2.5 text-left transition ${
                  selectedCity.toLowerCase() === c.city.toLowerCase()
                    ? "bg-brand text-white shadow-[2px_2px_0px_#121212]"
                    : "bg-sand/30 hover:bg-white text-ink shadow-[1.5px_1.5px_0px_#121212]"
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider opacity-80">{c.city}</p>
                <p className="text-lg font-black mt-0.5">{c.count} leads</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
