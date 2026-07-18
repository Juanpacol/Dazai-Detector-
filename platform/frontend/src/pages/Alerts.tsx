import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { RiskScoreBar } from "../components/RiskScoreBar";
import { TierBadge } from "../components/TierBadge";
import type { Alert } from "../types";

const TIERS = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tier, setTier] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = tier === "ALL" ? "" : `?tier=${tier}`;
    api
      .get<Alert[]>(`/alerts${query}`)
      .then(setAlerts)
      .catch((e) => setError(e.message));
  }, [tier]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`rounded-md px-3 py-1 text-sm ${
              tier === t ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600">Failed to load alerts: {error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/alerts/${alert.id}`} className="text-blue-600 hover:underline">
                    {alert.id}
                  </Link>
                </td>
                <td className="px-4 py-2">${alert.amount.toFixed(2)}</td>
                <td className="px-4 py-2">
                  <TierBadge tier={alert.risk_tier} />
                </td>
                <td className="px-4 py-2">
                  <RiskScoreBar score={alert.risk_score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {alerts.length === 0 && !error && (
          <p className="p-4 text-slate-500">No alerts for this filter.</p>
        )}
      </div>
    </div>
  );
}
