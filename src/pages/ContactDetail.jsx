import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useActionQuery, useActionMutation } from "@/hooks/useAction";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { NotFoundState, ErrorState, EmptyState, TableSkeleton } from "@/components/StateViews";
import { Pencil, Sparkles, Check } from "lucide-react";

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || "—"}</dd>
    </div>
  );
}

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const contact = useActionQuery("contactActions", { action: "get", id });
  const activities = useActionQuery("activityActions", { action: "list", filter: { entity_type: "contact", entity_id: id }, pageSize: 20 }, { enabled: !!id });

  const applyEnrichment = useActionMutation("contactActions");

  const doApplyEnrichment = async () => {
    const e = contact.data?.enriched_data || {};
    const data = {};
    if (e.company) data.company = e.company;
    if (e.job_title) data.title = e.job_title;
    if (e.phone) data.phone = e.phone;
    if (e.website) data.website = e.website;
    if (e.industry) data.industry = e.industry;
    data.enrichment_status = "approved";
    try {
      await applyEnrichment.mutateAsync({ action: "update", id, data });
      toast({ title: "Enrichment applied" });
    } catch (err) {
      toast({ variant: "destructive", title: "Apply failed", description: err.message });
    }
  };

  if (contact.isLoading) return <Skeleton className="h-64 w-full" />;
  if (contact.error?.code === "NOT_FOUND") return <NotFoundState entity="Contact" />;
  if (contact.error) return <ErrorState message={contact.error.message} onRetry={contact.refetch} />;

  const c = contact.data;
  const enrichment = c.enrichment_status === "pending_review" ? (c.enriched_data || {}) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground"><Link to="/contacts" className="hover:underline">Contacts</Link></div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.first_name} {c.last_name}</h1>
          <p className="text-sm text-muted-foreground">{c.email}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/contacts/${id}/edit`)}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Company" value={c.company} />
            <Field label="Title" value={c.title} />
            <Field label="Phone" value={c.phone} />
            <Field label="Status" value={c.status} />
          </dl>
          {c.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          )}
        </CardContent>
      </Card>

      {enrichment && (
        <Card className="border-primary/40">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Enrichment ready for review</CardTitle>
            <Button size="sm" onClick={doApplyEnrichment} disabled={applyEnrichment.isPending}><Check className="w-4 h-4 mr-1" />Apply</Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">AI-extracted from source text. Review before applying — nothing is written until you confirm.</p>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(enrichment).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
                <Field key={k} label={k.replace(/_/g, " ")} value={String(v)} />
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Activity timeline</CardTitle></CardHeader>
        <CardContent>
          {activities.isLoading ? <TableSkeleton rows={4} cols={2} /> : (activities.data?.items || []).length === 0 ? (
            <EmptyState title="No activity yet" description="Notes, calls, and emails for this contact will appear here." />
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