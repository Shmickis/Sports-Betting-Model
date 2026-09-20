import { getDb } from "@/lib/db/client";
import { ensureSeeded } from "@/lib/db/seed";
import { bankrollTransactions } from "@/lib/db/schema";
import { getSettings } from "@/lib/queries";
import { fmtMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function BankrollPage() {
  ensureSeeded();
  const s = getSettings();
  const txns = getDb().select().from(bankrollTransactions).all();

  return (
    <>
      <h1 className="page-title">Bankroll</h1>
      <p className="page-sub">
        Deposits, withdrawals, settlements, and bonuses. Default sizing is fixed
        unit — not Kelly.
      </p>
      <section className="grid-metrics">
        <article className="card">
          <p className="label">Current bankroll</p>
          <p className="value">{fmtMoney(s.bankrollUsd, false)}</p>
          <p className="meta">Unit ${s.unitUsd.toFixed(2)}</p>
        </article>
      </section>
      <div className="panel">
        <div className="panel-head">
          <h2>Transactions</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Source</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id}>
                  <td>{t.createdAt.slice(0, 19).replace("T", " ")}</td>
                  <td>{t.type}</td>
                  <td className={t.amountUsd >= 0 ? "pos" : "neg"}>
                    {fmtMoney(t.amountUsd)}
                  </td>
                  <td>{t.source || "Not recorded"}</td>
                  <td>{t.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
