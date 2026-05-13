"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

export type GlassModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Wider modals for dense content */
  size?: "md" | "lg";
};

const sizeClass: Record<NonNullable<GlassModalProps["size"]>, string> = {
  md: "max-w-lg sm:max-w-xl",
  lg: "max-w-xl sm:max-w-2xl",
};

export function GlassModal({ open, onClose, title, children, size = "lg" }: GlassModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="presentation"
          className="fixed inset-0 z-100 flex items-end justify-center p-4 pb-8 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-[#030712]/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="glass-modal-title"
            className={`relative z-10 flex max-h-[min(90dvh,880px)] w-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(165deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_35%,rgba(11,15,25,0.92)_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_32px_100px_-28px_rgba(16,185,129,0.12),0_24px_80px_-20px_rgba(99,102,241,0.18)] backdrop-blur-2xl ${sizeClass[size]}`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
              <h2
                id="glass-modal-title"
                className="pr-8 text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:border-emerald-400/30 hover:bg-white/10 hover:text-white sm:right-4 sm:top-4"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
