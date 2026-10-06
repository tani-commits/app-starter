import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useActionQuery, useActionMutation } from "@/hooks/useAction";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundState, ErrorState } from "@/components/StateViews";
import { ArrowLeft } from "lucide-react";

const STATUS = ["active", "paused", "inactive"];
const PLANS = ["starter", "growth", "enterprise"];

export default function AccountForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const existing = useActionQuery("clientAccountActions", { action: "get", id }, { enabled: isEdit });

  const [form, setForm] = useState({ name: "", industry: "", website: "", status: "active", plan: "starter", notes: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit && existing.data) {
      const d = existing.data;
      setForm({
        name: d.name || "", industry: d.industry || "", website: d.website || "",
        status: d.status || "active", plan: d.plan || "starter", notes: d.notes || ""
      });
    }
  }, [isEdit, existing.data]);

  const save = useActionMutation("clientAccountActions");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (isEdit) {
        await save.mutateAsync({ action: "update", id, data: form });
        toast({ title: "Account updated" });
        navigate(`/accounts/${id}`);
      } else {
        const rec = await save.mutateAsync({ action: "create", data: form });
        toast({ title: "Account created" });
        navigate(`/accounts/${rec.id}`);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    }
  };

  if (isEdit && existing.isLoading) return <Skeleton className="h-64 w-full" />;
  if (isEdit && existing.error?.code === "NOT_FOUND") return <NotFoundState entity="Account" />;
  if (isEdit && existing.error) return <ErrorState message={existing.error.message} onRetry={existing.refetch} />;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit ? `/accounts/${id}` : "/accounts")}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-2xl font-semibold tracking-tight">{isEdit ? "Edit account" : "New account"}</h1>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="example.com" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/accounts/${id}` : "/accounts")}>Cancel</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create account"}</Button>
        </div>
      </form>
    </div>
  );
}