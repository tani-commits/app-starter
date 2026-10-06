import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Building2, UserCircle } from "lucide-react";
import { appConfig } from "@/lib/app-config";

export default function Home() {
  const [me, setMe] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await base44.auth.me();
        if (!mounted) return;
        setMe(user);
        // Confirm RLS scoping: load the ClientAccounts this user is authorized for.
        const accs = await base44.entities.ClientAccount.list();
        if (!mounted) return;
        setAccounts(accs);
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load session");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">Couldn’t load your session</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const role = me?.role || "member";
  const scope = me?.account_ids || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          {appConfig.name} · Stage 1
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Entities &amp; security ready</h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-xl">
          The data and security layer is live. Authentication is enabled (email + Google), roles and
          per-account scoping are enforced by row-level security, and agents are modelled as scoped
          service accounts.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserCircle className="w-4 h-4 text-muted-foreground" />
              Signed in
            </div>
            <p className="mt-3 text-base font-medium">{me?.email || "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Role: <span className="font-medium text-foreground">{role}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Authorized accounts: <span className="font-medium text-foreground">{scope.length}</span>
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Visible client accounts
            </div>
            {accounts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                None yet. An admin can create the first Client Account.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {accounts.map((a) => (
                  <li key={a.id} className="text-sm font-medium">{a.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-5">
          <h2 className="text-sm font-semibold">Entities created</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            ClientAccount, Contact, Lead, Deal, Project, Task, Activity, Agent — each scoped to an
            owning ClientAccount with read/write/delete rules per role.
          </p>
        </div>
      </div>
    </div>
  );
}