import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useActionQuery, useActionMutation } from "@/hooks/useAction";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundState, ErrorState, EmptyState } from "@/components/StateViews";
import { ArrowLeft } from "lucide-react";

export default function ContactForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const existing = useActionQuery("contactActions", { action: "get", id }, { enabled: isEdit });
  const accounts = useActionQuery("clientAccountActions", { action: "list", pageSize: 200 });

  const [form, setForm] = useState({
    account_id: "", first_name: "", last_name: "", email: "", phone: "",
    title: "", company: "", status: "active"
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit && existing.data) {
      const d = existing.data;
      setForm({
        account_id: d.account_id || "", first_name: d.first_name || "", last_name: d.last_name || "",
        email: d.email || "", phone: d.phone || "", title: d.title || "",
        company: d.company || "", status: d.status || "active"
      });
    }
  }, [isEdit, existing.data]);

  const save = useActionMutation("contactActions");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.account_id) e.account_id = "Client account is required";
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (isEdit) {
        await save.mutateAsync({ action: "update", id, data: form });
        toast({ title: "Contact updated" });
        navigate(`/contacts/${id}`);
      } else {
        const rec = await save.mutateAsync({ action: "create", data: form });
        toast({ title: "Contact created" });
        navigate(`/contacts/${rec.id}`);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    }
  };

  if (isEdit && existing.isLoading) return <Skeleton className="h-64 w-full" />;
  if (isEdit && existing.error?.code === "NOT_FOUND") return <NotFoundState entity="Contact" />;
  if (isEdit && existing.error) return <ErrorState message={existing.error.message} onRetry={existing.refetch} />;

  const accItems = accounts.data?.items || [];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit ? `/contacts/${id}` : "/contacts")}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-2xl font-semibold tracking-tight">{isEdit ? "Edit contact" : "New contact"}</h1>
      </div>

      {accItems.length === 0 && !isEdit ? (
        <EmptyState title="No client accounts" description="Create a client account before adding contacts." actionLabel="New account" onAction={() => navigate("/accounts/new")} />
      ) : (
        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Client account <span className="text-destructive">*</span></Label>
                <Select value={form.account_id} onValueChange={(v) => set("account_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accItems.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.account_id && <p className="text-xs text-destructive">{errors.account_id}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">First name <span className="text-destructive">*</span></Label>
                  <Input id="first_name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
                  {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input id="last_name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={form.company} onChange={(e) => set("company", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/contacts/${id}` : "/contacts")}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create contact"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}