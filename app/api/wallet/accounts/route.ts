import { NextRequest, NextResponse } from "next/server";

const BASE = "https://rest.budgetbakers.com/wallet";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-wallet-token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const res = await fetch(`${BASE}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
