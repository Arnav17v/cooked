import type { ReactNode } from "react";

export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-10 text-lc-text">
      {children}
    </div>
  );
}
