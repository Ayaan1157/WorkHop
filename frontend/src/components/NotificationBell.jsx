import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Briefcase, CreditCard, CheckCheck, X, Zap, SlidersHorizontal } from "lucide-react";
import { getStoredNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/clientStore";
import { isPushEnabled } from "@/lib/pushNotifications";
import PushSettingsModal from "@/components/PushSettingsModal";

export default function NotificationBell({ embedded = false, className = "" }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [isPushActive, setIsPushActive] = useState(() => isPushEnabled());
  const dropdownRef = useRef(null);

  const refreshNotifs = () => {
    setNotifications(getStoredNotifications());
  };

  useEffect(() => {
    refreshNotifs();
    setIsPushActive(isPushEnabled());
  }, [open]);

  useEffect(() => {
    window.addEventListener("workhop:featured_blast", refreshNotifs);
    window.addEventListener("workhop:notifications_updated", refreshNotifs);
    const handlePushStatus = () => setIsPushActive(isPushEnabled());
    window.addEventListener("workhop:push_status_changed", handlePushStatus);
    const handleStorage = (e) => {
      if (e.key === "workhop_notifications" || e.key === "workhop_last_featured_blast") {
        refreshNotifs();
      }
      if (e.key === "workhop_push_enabled") {
        setIsPushActive(isPushEnabled());
      }
    };
    window.addEventListener("storage", handleStorage);

    let channel;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("workhop_featured_blast");
        channel.onmessage = refreshNotifs;
      }
    } catch {}

    return () => {
      window.removeEventListener("workhop:featured_blast", refreshNotifs);
      window.removeEventListener("workhop:notifications_updated", refreshNotifs);
      window.removeEventListener("workhop:push_status_changed", handlePushStatus);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnreadBlast = notifications.some((n) => !n.read && n.type === "featured_blast");

  const filtered = notifications.filter((n) => {
    if (tab === "all") return true;
    if (tab === "gig") return n.type === "gig" || n.type === "featured_blast";
    return n.type === tab;
  });

  const handleItemClick = (n) => {
    markNotificationRead(n.id);
    setNotifications(getStoredNotifications());
    setOpen(false);
    if (n.to) nav(n.to);
  };

  const handleMarkAll = () => {
    const updated = markAllNotificationsRead();
    setNotifications(updated);
  };

  const getIcon = (type) => {
    switch (type) {
      case "message":
        return <MessageSquare size={14} className="text-brand" />;
      case "gig":
        return <Briefcase size={14} className="text-ok" />;
      case "featured_blast":
        return <Zap size={14} className="text-brand fill-brand animate-pulse" />;
      case "payment":
        return <CreditCard size={14} className="text-[#3B82F6]" />;
      default:
        return <Bell size={14} className="text-ink dark:text-white" />;
    }
  };

  return (
    <div className={`relative ${embedded ? "h-full" : ""} ${className}`} ref={dropdownRef}>
      <button
        data-testid="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={
          embedded
            ? `relative flex h-full w-10 shrink-0 items-center justify-center transition hover:bg-sand dark:hover:bg-[#252525] text-ink dark:text-white ${
                open ? "bg-sand dark:bg-[#252525]" : ""
              }`
            : `relative flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-white dark:bg-[#1a1a1a] shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#333] transition hover:bg-sand dark:hover:bg-[#252525] text-ink dark:text-white ${
                open ? "bg-sand dark:bg-[#252525]" : ""
              }`
        }
      >
        <Bell size={16} className="text-ink dark:text-white" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1.5 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center border border-ink bg-brand text-[9.5px] font-black leading-none text-white z-10"
          >
            {hasUnreadBlast && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            )}
            <span className="relative">{unreadCount > 9 ? "9+" : unreadCount}</span>
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 top-12 z-50 w-[340px] max-w-[90vw] border-2 border-ink bg-white dark:bg-[#141414] text-ink dark:text-white shadow-2xl sm:w-[380px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-ink bg-sand dark:bg-[#1c1c1c] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-ink dark:text-white">NOTIFICATIONS</span>
              {unreadCount > 0 && (
                <span className="bg-brand px-1.5 py-0.5 text-[10px] font-black text-white">
                  {unreadCount} NEW
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-[10px] font-bold text-inkmuted dark:text-stone-400 hover:text-ink dark:hover:text-white"
                >
                  <CheckCheck size={13} />
                  <span>Mark read</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-inkmuted dark:text-stone-400 hover:text-ink dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Push Notifications Status Ribbon */}
          <div className="flex items-center justify-between border-b border-ink/20 bg-[#FFF8F3] dark:bg-[#1f1712] px-3.5 py-1.5 text-[10px]">
            <div className="flex items-center gap-1.5 font-bold text-ink dark:text-white">
              <span className="relative flex h-2 w-2">
                <span className={`inline-flex h-full w-full rounded-full ${isPushActive ? "bg-[#0E6220]" : "bg-brand animate-pulse"}`} />
              </span>
              <span>Push Alerts: <strong className={isPushActive ? "text-[#0E6220] dark:text-[#6ee7b7]" : "text-brand"}>{isPushActive ? "ACTIVE" : "OFF"}</strong></span>
            </div>
            <button
              onClick={() => setPushModalOpen(true)}
              className="flex items-center gap-1 font-black text-brand hover:underline cursor-pointer"
            >
              <SlidersHorizontal size={10} />
              <span>{isPushActive ? "Test & Settings" : "Enable Push"}</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b-2 border-ink bg-white dark:bg-[#181818] text-[10px] font-black">
            {[
              { key: "all", label: "ALL" },
              { key: "gig", label: "GIGS & BLASTS" },
              { key: "message", label: "MESSAGES" },
              { key: "payment", label: "ESCROW" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 text-center transition ${
                  tab === t.key
                    ? "border-b-2 border-brand bg-sand dark:bg-[#252525] text-ink dark:text-white"
                    : "text-inkmuted dark:text-stone-400 hover:text-ink dark:hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="wh-scroll max-h-[360px] divide-y divide-ink/10 dark:divide-white/10 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={24} className="mx-auto text-inkmuted dark:text-stone-600 opacity-40" />
                <p className="mt-2 text-xs font-bold text-inkmuted dark:text-stone-400">No notifications in this tab.</p>
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-sand dark:hover:bg-[#202020] ${
                    n.type === "featured_blast" && !n.read
                      ? "bg-[#FFF4EC] dark:bg-[#25150d] border-l-4 border-l-brand"
                      : !n.read
                      ? "bg-[#FFF9F3] dark:bg-[#1a1410]"
                      : "bg-white dark:bg-[#141414]"
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink dark:border-stone-700 ${
                    n.type === "featured_blast" ? "bg-[#FFE8D6] dark:bg-[#331c10]" : "bg-white dark:bg-[#222]"
                  }`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="truncate text-xs font-black text-ink dark:text-white">{n.title}</p>
                        {n.type === "featured_blast" && (
                          <span className="shrink-0 border border-brand bg-brand px-1 py-0.2 text-[8px] font-black text-white uppercase rounded-[1px]">
                            5KM BLAST
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-inkmuted dark:text-stone-400">{n.time}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-inkmuted dark:text-stone-400">{n.description}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      <PushSettingsModal isOpen={pushModalOpen} onClose={() => setPushModalOpen(false)} />
    </div>
  );
}
