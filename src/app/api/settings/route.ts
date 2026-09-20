import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const unitUsd = Number(body.unitUsd);
    const bankrollUsd = Number(body.bankrollUsd);
    if (!Number.isFinite(unitUsd) || unitUsd <= 0) {
      return NextResponse.json({ error: "Invalid unit size" }, { status: 400 });
    }
    if (!Number.isFinite(bankrollUsd)) {
      return NextResponse.json({ error: "Invalid bankroll" }, { status: 400 });
    }
    const settings = updateSettings({
      unitUsd,
      bankrollUsd,
      timezone: body.timezone,
    });
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
