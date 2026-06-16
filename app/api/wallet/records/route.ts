import { NextRequest, NextResponse } from "next/server";

const BASE = "https://rest.budgetbakers.com/wallet";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-wallet-token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  if (searchParams.get("accountId")) params.set("accountId", searchParams.get("accountId")!);
  params.set("limit", searchParams.get("limit") ?? "200");
  params.set("offset", searchParams.get("offset") ?? "0");

  const res = await fetch(`${BASE}/records?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-wallet-token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const body = await req.json();

  const res = await fetch(`${BASE}/v1/api/records`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
