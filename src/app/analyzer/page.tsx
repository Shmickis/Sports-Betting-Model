import { AnalyzerForm } from "@/components/AnalyzerForm";
import { getUnitUsd } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function AnalyzerPage() {
  const unitUsd = getUnitUsd();
  return (
    <>
      <h1 className="page-title">Bet Analyzer</h1>
      <p className="page-sub">
        Evaluate a proposed wager with TrueLine probability discipline. Blank
        probability fields stay blank — the desk returns INSUFFICIENT DATA instead
        of inventing numbers.
      </p>
      <AnalyzerForm unitUsd={unitUsd} />
    </>
  );
}
