import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, HelpCircle, Search, LogOut, User as UserIcon, Settings } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useActionQuery } from "@/hooks/useAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [q, setQ] = useState("");

  const { data: actData } = useActionQuery(
    "activityActions",
    { action: "list", pageSize: 8 },
    { refetchInterval: 30000 }
  );
  const activities = actData?.items || [];

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b bg-background px-4">
      <form onSubmit={onSearch} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients, contacts, deals…"
          className="pl-9 h-9"
        />
      </form>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toast({ title: "Help", description: "Documentation and shortcuts — coming soon." })}
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              {activities.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activities.length === 0 && (
              <DropdownMenuItem disabled>No recent activity</DropdownMenuItem>
            )}
            {activities.slice(0, 8).map((a) => (
              <DropdownMenuItem key={a.id} className="flex flex-col items-start py-2">
                <span className="text-sm font-medium">{a.description || a.type}</span>
                <span className="text-xs text-muted-foreground">
                  {a.actor_name} · {new Date(a.created_date).toLocaleString()}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><UserIcon className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user?.email}</div>
              <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="w-4 h-4 mr-2" />Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}