const TIER_STYLES: Record<string, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] ?? "bg-slate-100 text-slate-800";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {tier}
    </span>
  );
}
