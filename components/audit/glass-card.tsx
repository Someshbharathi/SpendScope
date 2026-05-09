import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
};

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_25px_80px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition-colors duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
