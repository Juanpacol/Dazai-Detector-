import { ChevronLeft, ChevronRight, Download, Inbox, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, BASE_URL } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { RiskScoreBar } from "../components/RiskScoreBar";
import { CardSkeleton } from "../components/Skeleton";
import { TierBadge } from "../components/TierBadge";
import { VerdictBadge } from "../components/VerdictBadge";
import type { AlertPage } from "../types";

const TIERS = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const PAGE_SIZE = 10;

type SortBy = "risk_score" | "amount" | "timestamp";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortBy; label: string }[] = [
  { key: "timestamp", label: "Timestamp" },
  { key: "amount", label: "Amount" },
  { key: "risk_score", label: "Risk Score" },
];

export default function Alerts() {
  const [page, setPage] = useState<AlertPage | null>(null);
  const [tier, setTier] = useState("ALL");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("risk_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const buildParams = (forExport = false) => {
    const params = new URLSearchParams({ sort_by: sortBy, sort_dir: sortDir });
    if (!forExport) params.set("limit", String(PAGE_SIZE));
    if (!forExport) params.set("offset", String(offset));
    if (tier !== "ALL") params.set("tier", tier);
    if (search) params.set("search", search);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (amountMin) params.set("amount_min", amountMin);
    if (amountMax) params.set("amount_max", amountMax);
    return params;
  };

  const load = () => {
    setError(null);
    api
      .get<AlertPage>(`/alerts?${buildParams().toString()}`)
      .then(setPage)
      .catch((e) => setError(e.message));
  };

  useEffect(load, [tier, offset, search, dateFrom, dateTo, amountMin, amountMax, sortBy, sortDir]);

  const handleTierChange = (t: string) => {
    setTier(t);
    setOffset(0);
  };

  const handleSort = (col: SortBy) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setOffset(0);
  };

  const handleExport = () => {
    window.open(`${BASE_URL}/api/alerts/export.csv?${buildParams(true).toString()}`, "_blank");
  };

  const total = page?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => handleTierChange(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tier === t
                  ? "bg-accent-600/20 text-accent-400 ring-1 ring-inset ring-accent-600/30"
                  : "bg-white/[0.03] text-slate-400 ring-1 ring-inset ring-white/[0.06] hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-300 ring-1 ring-inset ring-white/[0.06] hover:text-white"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Search by ID…"
            aria-label="Search alerts by ID"
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setOffset(0);
          }}
          aria-label="From date"
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
        />
        <span className="text-xs text-slate-600">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setOffset(0);
          }}
          aria-label="To date"
          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
        />
        <input
          type="number"
          value={amountMin}
          onChange={(e) => {
            setAmountMin(e.target.value);
            setOffset(0);
          }}
          placeholder="Min $"
          aria-label="Minimum amount"
          className="w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
        />
        <span className="text-xs text-slate-600">–</span>
        <input
          type="number"
          value={amountMax}
          onChange={(e) => {
            setAmountMax(e.target.value);
            setOffset(0);
          }}
          placeholder="Max $"
          aria-label="Maximum amount"
          className="w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent-600/40"
        />
        <p className="ml-auto text-xs text-slate-500">{total > 0 ? `Showing ${from}–${to} of ${total}` : "No results"}</p>
      </div>

      {error && !page && <ErrorState message={`Failed to load alerts: ${error}`} onRetry={load} />}
      {error && page && <p className="text-red-400">Failed to refresh alerts: {error}</p>}

      {!page && !error && <CardSkeleton lines={6} />}

      {page && (
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  <button
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 hover:text-slate-300"
                    aria-label={`Sort by ${col.label}`}
                  >
                    {col.label}
                    {sortBy === col.key && <span aria-hidden="true">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {page?.items.map((alert) => (
              <tr key={alert.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link to={`/alerts/${alert.id}`} className="text-accent-400 hover:underline">
                    {alert.id}
                  </Link>
                  <p className="text-xs text-slate-600">{new Date(alert.timestamp).toLocaleString()}</p>
                </td>
                <td className="px-4 py-3 text-slate-300">${alert.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <RiskScoreBar score={alert.risk_score} />
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier={alert.risk_tier} />
                </td>
                <td className="px-4 py-3">
                  <VerdictBadge verdict={alert.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {page.items.length === 0 && !error && (
          <EmptyState icon={Inbox} message="No alerts match this filter." />
        )}
      </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-400 ring-1 ring-inset ring-white/[0.06] hover:text-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={to >= total}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-400 ring-1 ring-inset ring-white/[0.06] hover:text-slate-200 disabled:opacity-30"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
