import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useActionQuery, useActionMutation } from "@/hooks/useAction";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/StateViews";
import { Plus, Search, Archive } from "lucide-react";

export default function Contacts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [cursor, setCursor] = useState(null);

  const { data, isLoading, error, refetch } = useActionQuery("contactActions", {
    action: "list",
    filter: { status },
    pageSize: 25,
    ...(cursor ? { cursor } : {})
  });

  const items = data?.items || [];
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const archive = useActionMutation("contactActions");

  const doArchive = async (c) => {
    try {
      await archive.mutateAsync({ action: "archive", id: c.id });
      toast({
        title: "Contact archived",
        description: `${c.first_name} ${c.last_name} was archived.`,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await archive.mutateAsync({ action: "update", id: c.id, data: { status: "active" } });
              toast({ title: "Restored" });
            } catch (e) {
              toast({ variant: "destructive", title: "Restore failed", description: e.message });
            }
          }
        }
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Archive failed", description: e.message });
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">People across your client accounts.</p>
        </div>
        <Button onClick={() => navigate("/contacts/new")}><Plus className="w-4 h-4 mr-2" />New contact</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts…" className="pl-9 h-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No contacts"
              description={search ? "No contacts match your search." : "Add your first contact to get started."}
              actionLabel={search ? undefined : "New contact"}
              onAction={() => navigate("/contacts/new")}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium"><Link to={`/contacts/${c.id}`} className="hover:underline">{c.first_name} {c.last_name}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.company || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.title || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => doArchive(c)} title="Archive"><Archive className="w-4 h-4" /></Button>
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
    </div>
  );
}