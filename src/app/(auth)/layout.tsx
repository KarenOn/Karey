import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(45,58,102,0.14),transparent_22%)]" />
      <div className="pointer-events-none absolute left-[-7rem] top-12 h-56 w-56 rounded-full bg-[rgba(13,148,136,0.12)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 right-[-4rem] h-64 w-64 rounded-full bg-[rgba(45,58,102,0.16)] blur-3xl" />
      {children}
    </div>
  );
}
