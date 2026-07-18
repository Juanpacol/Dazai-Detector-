import { AnimatePresence, motion } from "motion/react";
import { Route, Routes, useLocation } from "react-router-dom";

import { Particles } from "./components/reactbits/Particles";
import { Sidebar } from "./components/Sidebar";
import AlertDetail from "./pages/AlertDetail";
import Alerts from "./pages/Alerts";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/chat": "Investigation Chat",
};

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/alerts/")) return "Alert Detail";
  return PAGE_TITLES[pathname] ?? "Dazai Detector";
}

export default function App() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 lg:h-screen lg:flex-row">
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Particles className="opacity-20" particleCount={110} />
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/[0.06] px-4 lg:px-8">
          <h1 className="text-sm font-medium text-slate-300">{pageTitle(location.pathname)}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/alerts/:id" element={<AlertDetail />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/chat" element={<Chat />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
