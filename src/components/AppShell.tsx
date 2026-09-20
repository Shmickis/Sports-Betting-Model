"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function AppShell({
  children,
  dataMode,
}: {
  children: React.ReactNode;
  dataMode: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <aside className={cn("sidebar", open && "open")}>
        <div className="sidebar-brand">
          <span className="mark" />
          <div>
            <strong>TrueLine</strong>
            <em>Command center</em>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(pathname === item.href && "active")}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="mode-pill">
          {dataMode === "manual" ? "Manual data mode" : dataMode}
        </p>
      </aside>

      <div className="main">
        <header className="mobile-bar">
          <button type="button" onClick={() => setOpen((v) => !v)}>
            Menu
          </button>
          <strong>TrueLine</strong>
          <span className="mode-pill tiny">Manual</span>
        </header>
        {open ? (
          <button
            type="button"
            className="scrim"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        ) : null}
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
