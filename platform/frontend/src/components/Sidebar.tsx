import { FileText, LayoutDashboard, MessageSquare, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { NavLink, useLocation } from "react-router-dom";

import { ShinyText } from "./reactbits/ShinyText";

const LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert, end: false },
  { to: "/reports", label: "Reports", icon: FileText, end: false },
  { to: "/chat", label: "Chat", icon: MessageSquare, end: false },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/[0.06] bg-ink-900/60 p-4 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="mb-6 flex items-center gap-2 px-2 lg:mb-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-900 text-sm font-bold text-white shadow-glow">
          D
        </div>
        <ShinyText text="Dazai Detector" className="font-semibold tracking-tight" />
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {LINKS.map(({ to, label, icon: Icon, end }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={`relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors lg:shrink ${
                isActive ? "text-accent-400" : "text-slate-400 hover:translate-x-0.5 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-accent-600/15 ring-1 ring-inset ring-accent-600/30"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon size={17} strokeWidth={2} className="relative" />
              <span className="relative">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-ink-800/60 p-3 text-xs text-slate-500 lg:mt-auto">
        Hybrid DBSCAN + XGBoost risk engine, grounded chat, and automatic reports.
      </div>
    </aside>
  );
}
