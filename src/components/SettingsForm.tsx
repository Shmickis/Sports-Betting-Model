"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SettingsForm({
  initial,
}: {
  initial: { unitUsd: number; timezone: string; bankrollUsd: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [unitUsd, setUnitUsd] = useState(String(initial.unitUsd));
  const [timezone, setTimezone] = useState(initial.timezone);
  const [bankrollUsd, setBankrollUsd] = useState(String(initial.bankrollUsd));
  const [msg, setMsg] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitUsd: Number(unitUsd),
          timezone,
          bankrollUsd: Number(bankrollUsd),
        }),
      });
      if (res.ok) {
        setMsg("Settings saved. Historical dollar stakes are unchanged.");
        router.refresh();
      } else {
        setMsg("Save failed");
      }
    });
  }

  return (
    <form className="panel" onSubmit={onSubmit}>
      <div className="panel-head">
        <h2>Desk settings</h2>
      </div>
      <div className="form-grid">
        <label>
          Unit size (USD)
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={unitUsd}
            onChange={(e) => setUnitUsd(e.target.value)}
            required
          />
        </label>
        <label>
          Bankroll (USD)
          <input
            type="number"
            step="0.01"
            value={bankrollUsd}
            onChange={(e) => setBankrollUsd(e.target.value)}
            required
          />
        </label>
        <label className="full">
          Timezone
          <input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </label>
      </div>
      <div className="result-box">
        <button className="btn primary" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save settings"}
        </button>
        {msg ? <p className="pos">{msg}</p> : null}
        <p className="meta" style={{ marginTop: "0.75rem" }}>
          Changing unit size only affects new unit displays. Historical stake_usd
          values stay frozen.
        </p>
      </div>
    </form>
  );
}
