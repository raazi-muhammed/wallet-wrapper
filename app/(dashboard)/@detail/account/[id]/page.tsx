import { AccountRecordsView } from "@/app/components/AccountRecordsView";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountRecordsView accountId={id} />;
}
