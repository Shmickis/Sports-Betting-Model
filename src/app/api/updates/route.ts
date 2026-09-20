import { NextResponse } from "next/server";
import { applyModelUpdate, patchPaperBet } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body?.type === "paper") {
      const snapshot = patchPaperBet(body);
      return NextResponse.json(snapshot);
    }
    const snapshot = applyModelUpdate(body ?? {});
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}
