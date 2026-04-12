import { NextResponse } from "next/server";
import { getRequests, createRequest } from "@/lib/ops/service";
import type { Request as OpsRequest } from "@/lib/ops/types";

export async function GET() {
  return NextResponse.json(getRequests());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<OpsRequest, "id">;
  const req  = createRequest(body);
  return NextResponse.json(req, { status: 201 });
}
