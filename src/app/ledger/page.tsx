import { LedgerTools } from "@/components/LedgerTools";
import { listAudit, listWagers } from "@/lib/queries";
import { fmtMoney, fmtOdds, fmtPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ portfolio?: string }>;
}) {
  const sp = await searchParams;
  const portfolio = sp.portfolio;
  const rows = listWagers(
    portfolio === "official"
      ? { officialOnly: true }
      : portfolio === "paper"
        ? { portfolio: "Paper" }
        : undefined,
  );
  const audits = listAudit().slice(0, 20);

  return (
    <>
      <h1 className="page-title">Ledger</h1>
      <p className="page-sub">
        Permanent wager records. Corrections write audit entries — never silent
        overwrites. CLV stays Unconfirmed unless a real close was recorded.
      </p>

      <div className="warning">
        Prospective classifications are preserved. Results never upgrade or
        downgrade the original decision label.
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{rows.length} wagers</h2>
          <div>
            <a className="btn row" href="/ledger">
              All
            </a>
            <a className="btn row" href="/ledger?portfolio=official">
              Official
            </a>
            <a className="btn row" href="/ledger?portfolio=paper">
              Paper
            </a>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Class</th>
                <th>Play</th>
                <th>Book</th>
                <th>Odds</th>
                <th>Base / Promo</th>
                <th>Stake</th>
                <th>TL Prob</th>
                <th>Edge</th>
                <th>CLV</th>
                <th>Result</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id}>
                  <td>
                    <small>{w.id}</small>
                  </td>
                  <td>{(w.placedAt || w.eventDate || "Unknown").slice(0, 10)}</td>
                  <td>
                    <span
                      className={`badge ${
                        w.officialStatus === "official" ? "play" : "independent"
                      }`}
                    >
                      {w.officialStatus === "official"
                        ? "Official"
                        : w.classification}
                    </span>
                  </td>
                  <td>
                    <strong>{w.selection}</strong>
                    <small>
                      {w.sport} · {w.event || w.marketType || "Unknown"}
                      {w.line != null ? ` · ${w.line}` : ""}
                    </small>
                  </td>
                  <td>{w.sportsbook || "Not recorded"}</td>
                  <td>{fmtOdds(w.entryOdds)}</td>
                  <td>
                    <small>
                      Base {fmtOdds(w.baseOdds)}
                      <br />
                      Promo {fmtOdds(w.promoOdds)} · {w.promotionType || "cash"}
                    </small>
                  </td>
                  <td>
                    {fmtMoney(w.stakeUsd, false)}
                    <small>
                      {w.stakeUnits != null
                        ? `${w.stakeUnits.toFixed(2)}u`
                        : "Units unknown"}
                    </small>
                  </td>
                  <td>{w.truelineProb || "Not recorded"}</td>
                  <td>
                    {w.estimatedEdge != null
                      ? fmtPct(w.estimatedEdge)
                      : "Not recorded"}
                  </td>
                  <td className="amber">
                    {w.clvStatus}
                    <small>{w.clvNote || ""}</small>
                  </td>
                  <td>{w.result || "Awaiting data"}</td>
                  <td className={(w.pnlUsd ?? 0) >= 0 ? "pos" : "neg"}>
                    {fmtMoney(w.pnlUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LedgerTools
        wagers={rows.map((w) => ({
          id: w.id,
          selection: w.selection,
          event: w.event,
        }))}
      />

      <div className="panel">
        <div className="panel-head">
          <h2>Recent audit log</h2>
        </div>
        {audits.length === 0 ? (
          <p className="empty">No corrections yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Wager</th>
                  <th>Field</th>
                  <th>Previous</th>
                  <th>Corrected</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td>{a.createdAt.slice(0, 19)}</td>
                    <td>
                      <small>{a.wagerId}</small>
                    </td>
                    <td>{a.field}</td>
                    <td>{a.previousValue || "—"}</td>
                    <td>{a.correctedValue || "—"}</td>
                    <td>{a.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
