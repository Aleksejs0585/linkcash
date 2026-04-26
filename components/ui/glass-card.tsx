import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
};

export default function GlassCard({ children, className }: GlassCardProps) {
  return <div className={`glass-card w-full p-6 ${className ?? ""}`}>{children}</div>;
}
