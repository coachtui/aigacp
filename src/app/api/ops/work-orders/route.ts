import { NextResponse } from "next/server";
import { getWorkOrders, createWorkOrder } from "@/lib/ops/service";
import type { WorkOrder } from "@/lib/ops/types";

export async function GET() {
  return NextResponse.json(getWorkOrders());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<WorkOrder, "id" | "createdAt">;
  const wo   = createWorkOrder(body);
  return NextResponse.json(wo, { status: 201 });
}
