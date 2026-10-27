import axios from "axios";
import {
  fetchAccounts,
  fetchRecords,
  fetchApiStats,
  fetchCategories,
  fetchLabels,
  fetchBudgets,
  fetchStandingOrders,
  fetchStandingOrderItems,
} from "@/lib/wallet-reads";

type Params = URLSearchParams;

const optional = (p: Params, key: string) => p.get(key) || undefined;
const optionalNumber = (p: Params, key: string) => (p.has(key) ? Number(p.get(key)) : undefined);

const readers: Record<string, (token: string, p: Params) => Promise<unknown>> = {
  accounts: (token) => fetchAccounts(token),
  records: (token, p) =>
    fetchRecords(token, {
      accountId: optional(p, "accountId"),
      from: optional(p, "from"),
      offset: optionalNumber(p, "offset"),
      limit: optionalNumber(p, "limit"),
      note: optional(p, "note"),
      counterParty: optional(p, "counterParty"),
    }),
  stats: (token) => fetchApiStats(token),
  categories: (token) => fetchCategories(token),
  labels: (token) => fetchLabels(token),
  budgets: (token) => fetchBudgets(token),
  "standing-orders": (token) => fetchStandingOrders(token),
  "standing-order-items": (token, p) => fetchStandingOrderItems(token, p.get("from") ?? ""),
};

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const read = readers[resource];
  if (!read) return Response.json({ error: `Unknown resource: ${resource}` }, { status: 404 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Missing token" }, { status: 401 });

  try {
    return Response.json(await read(token, new URL(request.url).searchParams));
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const data = e.response?.data as { error?: string; message?: string } | undefined;
      return Response.json({ error: data?.error ?? data?.message ?? e.message }, { status: e.response?.status ?? 502 });
    }
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
