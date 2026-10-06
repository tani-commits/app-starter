import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useActionQuery, useActionMutation } from "@/hooks/useAction";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/StateViews";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Plus, Search, Trash2 } from "lucide-react";

export default function Accounts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("-created_date");
  const [selected, setSelected] = useState({});
  const [cursor, setCursor] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data, isLoading, error, refetch } = useActionQuery("clientAccountActions", {
    action: "list", sort, pageSize: 25, ...(cursor ? { cursor } : {})
  });

  const items = data?.items || [];
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (a) => (a.name || "").toLowerCase().includes(q) || (a.industry || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const toggleAll = (checked) => {
    const next = {};
    if (checked) filtered.forEach((a) => (next[a.id] = true));
    setSelected(next);
  };

  const deleteOne = useActionMutation("clientAccountActions");
  const bulkDelete = useActionMutation("clientAccountActions");

  const doDelete = async () => {
    try {
      await deleteOne.mutateAsync({ action: "delete", id: pendingDelete.id });
      toast({ title: "Submitted for approval", description: "Account deletion is pending manager approval." });
      setPendingDelete(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Delete failed", description: e.message });
    }
  };

  const doBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync({ action: "bulkDelete", ids: selectedIds });
      toast({ title: "Submitted for approval", description: `${selectedIds.length} accounts queued for deletion.` });
      setSelected({});
    } catch (e) {
      toast({ variant: "destructive", title: "Bulk delete failed", description: e.message });
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Client accounts</h1>
          <p className="text-sm text-muted-foreground">Tenants you can access.</p>
        </div>
        <Button onClick={() => navigate("/accounts/new")}><Plus className="w-4 h-4 mr-2" />New account</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts…" className="pl-9 h-9" />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="-created_date">Newest first</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="-name">Name Z–A</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.length > 0 && (
          <ConfirmDialog
            trigger={<Button variant="outline" size="sm"><Trash2 className="w-4 h-4 mr-2" />Delete {selectedIds.length}</Button>}
            title="Delete selected accounts?"
            description="This is a destructive action and will be sent for manager approval before anything is removed."
            confirmLabel="Submit for approval" destructive onConfirm={doBulkDelete} loading={bulkDelete.isPending}
          />
        )}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No client accounts"
              description={search ? "No accounts match your search." : "Add your first client account to get started."}
              actionLabel={search ? undefined : "New account"}
              onAction={() => navigate("/accounts/new")}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selectedIds.length === filtered.length} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><Checkbox checked={!!selected[a.id]} onCheckedChange={(c) => setSelected((s) => ({ ...s, [a.id]: !!c }))} /></TableCell>
                  <TableCell className="font-medium"><Link to={`/accounts/${a.id}`} className="hover:underline">{a.name}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{a.industry || "—"}</TableCell>
                  <TableCell className="capitalize">{a.status}</TableCell>
                  <TableCell className="capitalize">{a.plan || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setPendingDelete(a)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!isLoading && data?.hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setCursor(data.nextCursor)}>Load more</Button>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This is a destructive action and will be sent for manager approval before the account is removed."
        confirmLabel="Submit for approval" destructive onConfirm={doDelete} loading={deleteOne.isPending}
      />
    </div>
  );
}