import { getAllLookups } from "@/lib/lookups";
import { LookupsClient } from "./lookups-client";

export const metadata = { title: "Lookups" };

export default async function LookupsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const all = await getAllLookups();
  const types = [...all.values()].sort((a, b) => a.label.localeCompare(b.label));
  const selected = (type && all.get(type)) || types[0] || null;
  return <LookupsClient types={types.map(({ values: _v, ...t }) => t)} selected={selected} />;
}
