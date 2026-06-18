import { NextRequest, NextResponse } from "next/server";

const BASE = "https://rest.budgetbakers.com/wallet";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.headers.get("x-wallet-token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const res = await fetch(`${BASE}/v1/api/records/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
