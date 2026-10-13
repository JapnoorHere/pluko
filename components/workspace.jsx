"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast as notify } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Modal } from "@/components/dashboard-primitives";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Auth,
  Overview,
  Playground,
  Jobs,
  Projects,
  Keys,
  Logs,
  Feedback,
  Docs,
  Account,
} from "@/components/customer-screens";
import { Users, Provider, Audit, Storage } from "@/components/admin-screens";
import {
  Activity,
  BookOpen,
  Boxes,
  CheckCircle2,
  ClipboardList,
  CloudCog,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings2,
  Sparkles,
  UsersRound,
} from "lucide-react";

const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["playground", "Playground", Sparkles],
  ["jobs", "Search jobs", Search],
  ["projects", "Projects", FolderKanban],
  ["keys", "API keys", KeyRound],
  ["logs", "Request logs", ClipboardList],
  ["feedback", "Quality feedback", CheckCircle2],
  ["docs", "API guide", BookOpen],
  ["account", "Account", Settings2],
];
const adminNav = [
  ["users", "Users & invites", UsersRound],
  ["provider", "Provider & rules", CloudCog],
  ["audit", "Audit history", Activity],
  ["storage", "Storage & retention", Boxes],
];

export default function Workspace({ audience = "customer" }) {
  const router = useRouter();
  const [me, setMe] = useState(null),
    [csrf, setCsrf] = useState(""),
    [view, setView] = useState("overview"),
    [modal, setModal] = useState(null),
    [sessionReady, setSessionReady] = useState(false);
  const call = useCallback(
    async (path, body, options = {}) => {
      const r = await fetch(path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(options.apiKey
            ? { Authorization: `Bearer ${options.apiKey}` }
            : { "X-CSRF-Token": csrf }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || "Request failed");
      return d;
    },
    [csrf],
  );
  const refresh = useCallback(async () => {
    try {
      const d = await call("/api/me");
      setMe(d.user);
      setCsrf(d.csrf);
    } catch {
      setMe(null);
      setCsrf("");
    } finally {
      setSessionReady(true);
    }
  }, [call]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const toast = useCallback((message) => notify(message), []);
  const mfaRequired = me?.role === "admin" && !me.mfa;
  const activeView = mfaRequired ? "account" : view;
  const finishMfaSetup = useCallback(async () => {
    await refresh();
    setModal(null);
    setView("overview");
  }, [refresh]);
  const wrongPortal = me && (audience === "admin" ? me.role !== "admin" : me.role === "admin");
  useEffect(() => {
    if (wrongPortal) router.replace(me.role === "admin" ? "/admin" : "/app");
  }, [wrongPortal, me, router]);
  if (!sessionReady || wrongPortal)
    return (
      <main className="sessionLoading">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </main>
    );
  if (!me) return <Auth call={call} onAuthenticated={refresh} toast={toast} adminOnly={audience === "admin"} />;
  return (
    <>
      <DashboardShell
        me={me}
        view={activeView}
        setView={setView}
        nav={nav}
        adminNav={adminNav}
        signOut={async () => {
          await call("/api/logout", {});
          setMe(null);
        }}
      >
        <Screen
          view={activeView}
          call={call}
          me={me}
          toast={toast}
          modal={setModal}
          setView={setView}
          onMfaEnabled={finishMfaSetup}
        />
      </DashboardShell>
      {modal && <Modal close={() => setModal(null)}>{modal}</Modal>}
    </>
  );
}

function Screen({ view, call, me, toast, modal, setView, onMfaEnabled }) {
  const screens = {
    overview: Overview,
    playground: Playground,
    jobs: Jobs,
    projects: Projects,
    keys: Keys,
    logs: Logs,
    feedback: Feedback,
    docs: Docs,
    account: Account,
    users: Users,
    provider: Provider,
    audit: Audit,
    storage: Storage,
  };
  const Component = screens[view] || Overview;
  return (
    <Component
      call={call}
      me={me}
      toast={toast}
      modal={modal}
      setView={setView}
      onMfaEnabled={onMfaEnabled}
      required={view === "account" && me.role === "admin" && !me.mfa}
    />
  );
}
