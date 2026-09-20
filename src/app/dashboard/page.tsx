import Link from "next/link";
import { dashboardSummary } from "@/lib/queries";
import { fmtMoney, fmtOdds, fmtRoi } from "@/lib/utils";
import { Tip } from "@/components/Tip";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    sport?: string;
    sportsbook?: string;
    classification?: string;
    promotionType?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const sp = await searchParams;
  const d = dashboardSummary({
    sport: sp.sport || undefined,
    sportsbook: sp.sportsbook || undefined,
    classification: sp.classification || undefined,
    promotionType: sp.promotionType || undefined,
    dateFrom: sp.dateFrom || undefined,
    dateTo: sp.dateTo || undefined,
  });

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">
        High-level TrueLine desk state. Official and non-Official portfolios stay
        separated. Missing inputs stay labeled — never invented.
      </p>

      {d.dataMode === "manual" ? (
        <div className="warning">
          Manual data mode — no live odds, injuries, weather, or results feeds
          are connected. Do not treat any board as auto-scanned.
        </div>
      ) : null}

      <form className="panel" method="get">
        <div className="panel-head">
          <h2>Filters</h2>
          <Link className="btn" href="/dashboard">
            Clear
          </Link>
        </div>
        <div className="form-grid">
          <label>
            Sport
            <select name="sport" defaultValue={sp.sport || ""}>
              <option value="">All</option>
              {d.filterOptions.sports.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sportsbook
            <select name="sportsbook" defaultValue={sp.sportsbook || ""}>
              <option value="">All</option>
              {d.filterOptions.books.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Classification
            <select name="classification" defaultValue={sp.classification || ""}>
              <option value="">All</option>
              {d.filterOptions.classes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cash / promo
            <select name="promotionType" defaultValue={sp.promotionType || ""}>
              <option value="">All</option>
              <option value="cash">Cash only</option>
              <option value="bonus">Bonus</option>
              <option value="freebet">Free bet</option>
              <option value="boost">Boost</option>
            </select>
          </label>
          <label>
            From
            <input type="date" name="dateFrom" defaultValue={sp.dateFrom || ""} />
          </label>
          <label>
            To
            <input type="date" name="dateTo" defaultValue={sp.dateTo || ""} />
          </label>
          <label className="full">
            <button className="btn primary" type="submit">
              Apply filters
            </button>
          </label>
        </div>
      </form>

      <section className="grid-metrics">
        <article className="card">
          <p className="label">Bankroll</p>
          <p className="value">{fmtMoney(d.bankroll, false)}</p>
          <p className="meta">Unit = ${d.unitUsd.toFixed(2)}</p>
        </article>
        <article className="card">
          <p className="label">
            Official PLAY cash P/L <Tip text="Cash Official only — promos excluded from this ROI." />
          </p>
          <p className={`value ${d.official.pnl >= 0 ? "pos" : "neg"}`}>
            {fmtMoney(d.official.pnl)}
          </p>
          <p className="meta">
            {d.official.record} · ROI {fmtRoi(d.official.roi)} · {d.official.maturity}
          </p>
        </article>
        <article className="card">
          <p className="label">Non-Official</p>
          <p className={`value ${d.nonOfficial.pnl >= 0 ? "pos" : "neg"}`}>
            {fmtMoney(d.nonOfficial.pnl)}
          </p>
          <p className="meta">
            {d.nonOfficial.record} · ROI {fmtRoi(d.nonOfficial.roi)}
          </p>
        </article>
        <article className="card">
          <p className="label">Open / awaiting</p>
          <p className="value">
            {d.openCount}
            <span className="meta"> / {d.awaitingCount}</span>
          </p>
          <p className="meta">
            Edge Watch: {d.edgeWatchCount} · Model {d.model?.version ?? "Unknown"}
          </p>
        </article>
      </section>

      <section className="grid-metrics">
        <article className="card">
          <p className="label">
            Confirmed avg CLV <Tip text="Shown only when confirmed same-book closes exist. Otherwise Unconfirmed." />
          </p>
          <p className="value amber">
            {d.confirmedAvgClv == null
              ? "Unconfirmed"
              : `${d.confirmedAvgClv.toFixed(2)} pp`}
          </p>
          <p className="meta">
            {d.confirmedClvCount === 0
              ? "No confirmed close refs — metric withheld"
              : `${d.confirmedClvCount} confirmed close refs`}
          </p>
        </article>
        <article className="card">
          <p className="label">Today P/L/Lean/Pass</p>
          <p className="value" style={{ fontSize: "1.15rem" }}>
            {d.today.plays}/{d.today.leans}/{d.today.passes}
          </p>
          <p className="meta">Prospective labels for today&apos;s desk activity</p>
        </article>
        <article className="card">
          <p className="label">Integrity</p>
          <p className="value amber">{d.alerts.length}</p>
          <p className="meta">Active desk warnings</p>
        </article>
        <article className="card">
          <p className="label">Official risked (cash)</p>
          <p className="value">{fmtMoney(d.official.risked, false)}</p>
          <p className="meta">{d.official.settled} settled Official plays</p>
        </article>
      </section>

      <div className="panel">
        <div className="panel-head">
          <h2>Recent ledger activity</h2>
          <Link className="btn" href="/ledger">
            Full ledger
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Class</th>
                <th>Play</th>
                <th>Odds</th>
                <th>Result</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {d.recent.map((w) => (
                <tr key={w.id}>
                  <td>{(w.placedAt || w.eventDate || "Unknown").slice(0, 10)}</td>
                  <td>
                    <span
                      className={`badge ${
                        w.officialStatus === "official"
                          ? "play"
                          : w.classification.toLowerCase().includes("pass")
                            ? "pass"
                            : w.classification.toLowerCase().includes("lean")
                              ? "lean"
                              : "independent"
                      }`}
                    >
                      {w.officialStatus === "official"
                        ? "Official PLAY"
                        : w.classification}
                    </span>
                  </td>
                  <td>
                    <strong>{w.selection}</strong>
                    <small>
                      {w.sport} · {w.event || w.marketType || "Unknown event"}
                    </small>
                  </td>
                  <td>{fmtOdds(w.entryOdds)}</td>
                  <td>{w.result ?? "Awaiting data"}</td>
                  <td className={(w.pnlUsd ?? 0) >= 0 ? "pos" : "neg"}>
                    {fmtMoney(w.pnlUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Recent alerts</h2>
        </div>
        {d.alerts.length === 0 ? (
          <p className="empty">No alerts.</p>
        ) : (
          <ul className="empty" style={{ listStyle: "none", margin: 0 }}>
            {d.alerts.map((a) => (
              <li key={a.id} style={{ marginBottom: "0.65rem" }}>
                <strong>{a.title}</strong>
                <div className="meta">{a.body}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
