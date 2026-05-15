import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  glow?: "center" | "top" | "none";
};

export default function AppShell({
  children,
  className = "",
  glow = "center",
}: AppShellProps) {
  return (
    <main className={`app-page ${className}`.trim()}>
      {glow !== "none" ? (
        <div
          className={`app-page-glow app-page-glow--${glow}`}
          aria-hidden
        />
      ) : null}
      {children}
    </main>
  );
}
