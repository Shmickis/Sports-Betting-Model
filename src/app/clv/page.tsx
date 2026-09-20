import { ClvClient } from "@/components/ClvClient";
import { listClvBoard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function ClvPage() {
  const rows = listClvBoard();
  return (
    <>
      <h1 className="page-title">CLV Tracker</h1>
      <p className="page-sub">
        Entry → ~6h → ~90m → ~30m → near-close checkpoints. Prefer same
        sportsbook, market, selection, and threshold. Base-market CLV stays
        separate from boost economics.
      </p>
      <div className="warning">
        Never claim an exact close when only a near-start reference exists —
        those stay directional / unconfirmed.
      </div>
      <ClvClient rows={rows} />
    </>
  );
}
