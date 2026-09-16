import { useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";

export default function EditModal({
  isOpen,
  onClose,
  onSave,
  title,
  saving = false,
  children,
  wide = false,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      <div
        className={`relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[90vh] flex flex-col bg-white dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#2a2a2a] sm:rounded-xl overflow-hidden shadow-2xl`}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#2a2a2a] px-5 py-4">
          <h2 className="text-base font-bold text-ink dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition text-inkmuted dark:text-[#888]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scroll text-ink dark:text-white">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#e5e5e5] dark:border-[#2a2a2a] px-5 py-4 bg-[#fafafa] dark:bg-[#111]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-inkmuted dark:text-[#999] border border-[#ddd] dark:border-[#333] rounded-full hover:border-[#bbb] dark:hover:border-[#555] hover:text-ink dark:hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-semibold text-white bg-[#E65A1E] rounded-full hover:bg-[#F06B2E] transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #888; border-radius: 3px; }
        .dark .custom-scroll::-webkit-scrollbar-thumb { background: #333; }
      `}</style>
    </div>
  );
}

