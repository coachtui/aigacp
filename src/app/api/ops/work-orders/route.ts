import { NextResponse } from "next/server";

/**
 * OPS work orders API route — deprecated.
 *
 * MX is the single source of truth for all work orders.
 * Work order data is accessible via the MX module and MxProvider.
 */

export async function GET() {
  return NextResponse.json(
    { error: "OPS work orders endpoint removed. Use MX work orders." },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "OPS work orders endpoint removed. Create work orders through MX." },
    { status: 410 },
  );
}
