import { NextResponse } from "next/server";
import { getPourSchedule, createPourEvent } from "@/lib/ops/service";
import type { LegacyPourEvent } from "@/lib/ops/types";

export async function GET() {
  return NextResponse.json(getPourSchedule());
}

export async function POST(request: Request) {
  const body  = (await request.json()) as Omit<LegacyPourEvent, "id">;
  const event = createPourEvent(body);
  return NextResponse.json(event, { status: 201 });
}
