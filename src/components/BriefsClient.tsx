"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const SLOTS = ["morning", "afternoon", "nightly"] as const;

const PLACEHOLDERS: Record<(typeof SLOTS)[number], string> = {
  morning:
    "Slate overview, important matchups, projected starters, injury questions, weather, market context, markets needing deeper analysis…",
  afternoon:
    "Updated prices, confirmed lineups/starters, classification changes, new/removed opportunities, open wager monitoring…",
  nightly:
    "Settled wagers (book/market/line/odds/stake), original classification, P/L, bankroll change, CLV status, open carries, data-quality issues, lessons…",
};

export function BriefsClient({
  initial,
}: {
  initial: { slot: string; content: string; briefDate: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [contents, setContents] = useState(() => {
    const map: Record<string, string> = {
      morning: "",
      afternoon: "",
      nightly: "",
    };
    for (const b of initial) map[b.slot] = b.content;
    return map;
  });
  const [msg, setMsg] = useState<string | null>(null);

  function save(slot: string) {
    startTransition(async () => {
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "brief",
          slot,
          content: contents[slot],
        }),
      });
      setMsg(res.ok ? `${slot} brief saved` : "Save failed");
      router.refresh();
    });
  }

  return (
    <>
      <div className="warning">
        Briefs are manual until scheduled integrations exist. Do not invent injury,
        weather, or lineup facts.
      </div>
      {SLOTS.map((slot) => (
        <div className="panel" key={slot}>
          <div className="panel-head">
            <h2>{slot[0].toUpperCase() + slot.slice(1)} brief</h2>
            <button
              className="btn primary"
              type="button"
              disabled={pending}
              onClick={() => save(slot)}
            >
              Save
            </button>
          </div>
          <div className="result-box">
            <textarea
              rows={8}
              value={contents[slot]}
              placeholder={PLACEHOLDERS[slot]}
              onChange={(e) =>
                setContents((c) => ({ ...c, [slot]: e.target.value }))
              }
              style={{ width: "100%" }}
            />
          </div>
        </div>
      ))}
      {msg ? <p className="pos">{msg}</p> : null}
    </>
  );
}
