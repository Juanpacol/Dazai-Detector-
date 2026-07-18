import { Route, Routes } from "react-router-dom";

import { NavBar } from "./components/NavBar";
import AlertDetail from "./pages/AlertDetail";
import Alerts from "./pages/Alerts";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-5xl p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/alerts/:id" element={<AlertDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </main>
    </div>
  );
}
