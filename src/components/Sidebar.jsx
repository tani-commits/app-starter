import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, UserSearch, KanbanSquare, DollarSign,
  FolderKanban, CheckSquare, Activity, ListChecks, Zap, FileText, BarChart3,
  Bot, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { appConfig } from "@/lib/app-config";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/accounts", label: "Clients", icon: Building2 },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/leads", label: "Leads", icon: UserSearch },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/deals", label: "Deals", icon: DollarSign },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/activities", label: "Activities", icon: Activity },
  { to: "/onboarding", label: "Onboarding", icon: ListChecks },
  { to: "/automations", label: "Automations", icon: Zap },
  { to: "/content", label: "Content", icon: FileText },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/agents", label: "Agents & Audit", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar h-screen sticky top-0">
      <div className="h-14 flex items-center px-5 font-semibold border-b">{appConfig.name}</div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}