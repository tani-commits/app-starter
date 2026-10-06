import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useActionQuery, useActionMutation } from "@/hooks/useAction";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundState, ErrorState, EmptyState, TableSkeleton } from "@/components/StateViews";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pencil, Trash2, User, DollarSign, FolderKanban } from "lucide-react";

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || "—"}</dd>
    </div>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const account = useActionQuery("clientAccountActions", { action: "get", id });
  const contacts = useActionQuery("contactActions", { action: "list", filter: { account_id: id }, pageSize: 50 }, { enabled: !!id });
  const deals = useActionQuery("dealActions", { action: "list", filter: { account_id: id }, pageSize: 50 }, { enabled: !!id });
  const activities = useActionQuery("activityActions", { action: "list", filter: { account_id: id }, pageSize: 20 }, { enabled: !!id });

  const del = useActionMutation("clientAccountActions");

  if (account.isLoading) return <Skeleton className="h-64 w-full" />;
  if (account.error?.code === "NOT_FOUND") return <NotFoundState entity="Account" />;
  if (account.error) return <ErrorState message={account.error.message} onRetry={account.refetch} />;

  const a = account.data;

  const doDelete = async () => {
    try {
      await del.mutateAsync({ action: "delete", id });
      toast({ title: "Submitted for approval", description: "Account deletion is pending manager approval." });
      navigate("/accounts");
    } catch (e) {
      toast({ variant: "destructive", title: "Delete failed", description: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground"><Link to="/accounts" className="hover:underline">Accounts</Link></div>
          <h1 className="text-2xl font-semibold tracking-tight">{a.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/accounts/${id}/edit`)}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
          <ConfirmDialog
            trigger={<Button variant="outline"><Trash2 className="w-4 h-4 mr-2" />Delete</Button>}
            title={`Delete "${a.name}"?`}
            description="This is a destructive action and will be sent for manager approval before the account is removed."
            confirmLabel="Submit for approval" destructive onConfirm={doDelete} loading={del.isPending}
          />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Industry" value={a.industry} />
            <Field label="Website" value={a.website} />
            <Field label="Status" value={a.status && a.status[0].toUpperCase() + a.status.slice(1)} />
            <Field label="Plan" value={a.plan} />
            <Field label="Owner" value={a.owner_id} />
            <Field label="Created" value={new Date(a.created_date).toLocaleDateString()} />
          </dl>
          {a.notes && <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{a.notes}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Contacts</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/contacts/new">Add</Link></Button>
          </CardHeader>
          <CardContent>
            {contacts.isLoading ? <TableSkeleton rows={3} cols={2} /> : (contacts.data?.items || []).length === 0 ? (
              <EmptyState title="No contacts" description="Add a contact for this account." />
            ) : (
              <ul className="space-y-1.5">
                {(contacts.data?.items || []).map((c) => (
                  <li key={c.id}>
                    <Link to={`/contacts/${c.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{c.first_name} {c.last_name}</span>
                      <span className="text-muted-foreground truncate">{c.email}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Deals</CardTitle></CardHeader>
          <CardContent>
            {deals.isLoading ? <TableSkeleton rows={3} cols={2} /> : (deals.data?.items || []).length === 0 ? (
              <EmptyState title="No deals" description="Create a deal for this account." />
            ) : (
              <ul className="space-y-1.5">
                {(deals.data?.items || []).map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent text-sm">
                    <span className="font-medium truncate flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" />{d.title}</span>
                    <span className="capitalize text-muted-foreground">{d.stage}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Activity timeline</CardTitle>
          <FolderKanban className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {activities.isLoading ? <TableSkeleton rows={4} cols={2} /> : (activities.data?.items || []).length === 0 ? (
            <EmptyState title="No activity yet" description="Actions on this account will appear here." />
          ) : (
            <ol className="relative border-l ml-2 space-y-4 pl-4">
              {(activities.data?.items || []).map((act) => (
                <li key={act.id}>
                  <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary" />
                  <div className="text-sm font-medium">{act.description || act.type}</div>
                  <div className="text-xs text-muted-foreground">{act.actor_name} · {new Date(act.created_date).toLocaleString()}</div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}