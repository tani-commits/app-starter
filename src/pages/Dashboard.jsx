import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useActionQuery } from "@/hooks/useAction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState } from "@/components/StateViews";
import { Building2, DollarSign, FolderKanban, CheckSquare, AlertTriangle, ArrowRight } from "lucide-react";

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const accounts = useActionQuery("clientAccountActions", { action: "list", pageSize: 200 });
  const deals = useActionQuery("dealActions", { action: "list", pageSize: 200 });
  const projects = useActionQuery("projectActions", { action: "list", pageSize: 200 });
  const tasks = useActionQuery("taskActions", { action: "list", pageSize: 200 });
  const approvals = useActionQuery("approvalActions", { action: "list", pageSize: 50 }, { refetchInterval: 30000 });

  const anyLoading = accounts.isLoading || deals.isLoading || projects.isLoading || tasks.isLoading;
  const anyError = accounts.error || deals.error || projects.error || tasks.error;

  if (anyError) return <ErrorState message={anyError.message} onRetry={() => { accounts.refetch(); deals.refetch(); }} />;

  const accItems = accounts.data?.items || [];
  const dealItems = deals.data?.items || [];
  const projItems = projects.data?.items || [];
  const taskItems = tasks.data?.items || [];
  const pendingApprovals = approvals.data?.items || [];

  const openDeals = dealItems.filter((d) => !["won", "lost"].includes(d.stage));
  const pipelineValue = openDeals.reduce((s, d) => s + (d.value || 0), 0);
  const activeProjects = projItems.filter((p) => p.status === "active");
  const openTasks = taskItems.filter((t) => ["todo", "in_progress"].includes(t.status));
  const today = new Date().toISOString().slice(0, 10);
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < today);
  const wonDeals = dealItems.filter((d) => d.stage === "won");
  const winRate = dealItems.length ? Math.round((wonDeals.length / dealItems.length) * 100) : 0;

  const needsAttention = [
    { count: pendingApprovals.length, label: "pending approvals", to: "/agents" },
    { count: overdueTasks.length, label: "overdue tasks", to: "/tasks" }
  ].filter((x) => x.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview across every client account you can access.</p>
      </div>

      {needsAttention.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600" />Needs attention
            </div>
            {needsAttention.map((n) => (
              <Link key={n.label} to={n.to} className="text-sm text-primary hover:underline">
                {n.count} {n.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {anyLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Building2} label="Client accounts" value={accItems.length} hint={`${accItems.filter((a) => a.status === "active").length} active`} />
          <Metric icon={DollarSign} label="Open pipeline value" value={`$${pipelineValue.toLocaleString()}`} hint={`${openDeals.length} open deals`} />
          <Metric icon={FolderKanban} label="Active projects" value={activeProjects.length} hint={`${projItems.length} total`} />
          <Metric icon={CheckSquare} label="Open tasks" value={openTasks.length} hint={`${overdueTasks.length} overdue`} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pipeline snapshot</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pipeline">View <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dealItems.length === 0 ? (
              <EmptyState title="No deals yet" description="Create your first deal to see pipeline stages here." actionLabel="New deal" onAction={() => navigate("/deals")} />
            ) : (
              <div className="space-y-2">
                {["new", "qualified", "proposal", "negotiation", "won", "lost"].map((stage) => {
                  const count = dealItems.filter((d) => d.stage === stage).length;
                  return (
                    <div key={stage} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{stage}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  );
                })}
                <div className="pt-2 mt-2 border-t flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Win rate</span>
                  <span className="font-medium">{winRate}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent accounts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/accounts">View <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {accItems.length === 0 ? (
              <EmptyState title="No client accounts" description="Add your first client account to get started." actionLabel="New account" onAction={() => navigate("/accounts/new")} />
            ) : (
              <div className="space-y-2">
                {accItems.slice(0, 5).map((a) => (
                  <Link key={a.id} to={`/accounts/${a.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent text-sm">
                    <span className="font-medium truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{a.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}