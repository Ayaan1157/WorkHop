import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageSquare, Briefcase, CreditCard, CheckCheck, X } from "lucide-react";
import { getStoredNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/clientStore";

export default function NotificationBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setNotifications(getStoredNotifications());
  }, [open]);

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

  const filtered = notifications.filter((n) => {
    if (tab === "all") return true;
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
      case "payment":
        return <CreditCard size={14} className="text-[#3B82F6]" />;
      default:
        return <Bell size={14} className="text-ink" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        data-testid="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink transition hover:bg-sand ${
          open ? "bg-sand" : "bg-white"
        }`}
      >
        <Bell size={18} className="text-ink" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center border-2 border-ink bg-brand text-[10px] font-black text-white"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 top-12 z-50 w-[340px] max-w-[90vw] border-2 border-ink bg-white shadow-2xl sm:w-[380px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-ink bg-sand px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-ink">NOTIFICATIONS</span>
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
                  className="flex items-center gap-1 text-[10px] font-bold text-inkmuted hover:text-ink"
                >
                  <CheckCheck size={13} />
                  <span>Mark read</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-inkmuted hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b-2 border-ink bg-white text-[10px] font-black">
            {[
              { key: "all", label: "ALL" },
              { key: "message", label: "MESSAGES" },
              { key: "gig", label: "GIGS" },
              { key: "payment", label: "ESCROW" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 text-center transition ${
                  tab === t.key
                    ? "border-b-2 border-brand bg-sand text-ink"
                    : "text-inkmuted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="wh-scroll max-h-[360px] divide-y divide-ink/10 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={24} className="mx-auto text-inkmuted opacity-40" />
                <p className="mt-2 text-xs font-bold text-inkmuted">No notifications in this tab.</p>
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-sand ${
                    !n.read ? "bg-[#FFF9F3]" : "bg-white"
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-white">
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-black text-ink">{n.title}</p>
                      <span className="shrink-0 text-[10px] font-semibold text-inkmuted">{n.time}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-inkmuted">{n.description}</p>
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
    </div>
  );
}
