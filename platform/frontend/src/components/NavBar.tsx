import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/alerts", label: "Alerts" },
  { to: "/reports", label: "Reports" },
  { to: "/chat", label: "Chat" },
];

export function NavBar() {
  return (
    <nav className="flex items-center gap-6 border-b border-slate-200 bg-white px-6 py-3">
      <span className="font-semibold tracking-tight">Dazai Detector</span>
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) =>
            `text-sm ${isActive ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-700"}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
