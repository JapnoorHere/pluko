"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { WorkspaceContext } from "@/components/workspace/context";
import { WorkspaceShell } from "@/components/workspace/shell";
import { RefreshScope } from "@/components/workspace/refresh";
import { useWorkspaceTheme } from "@/components/workspace/theme";
import { Shimmer } from "@/components/workspace/ui";
import { parseRoute, routePath } from "@/lib/ui-helpers";
import { AuthScreen } from "@/components/screens/auth";
import { Overview } from "@/components/screens/overview";
import { Playground } from "@/components/screens/playground";
import { Jobs } from "@/components/screens/jobs";
import { JobPage } from "@/components/screens/job-detail";
import { Projects } from "@/components/screens/projects";
import { ProjectPage } from "@/components/screens/project-detail";
import { Keys } from "@/components/screens/keys";
import { Logs } from "@/components/screens/logs";
import { Feedback } from "@/components/screens/feedback";
import { Guide } from "@/components/screens/guide";
import { Account } from "@/components/screens/account";
import { AdminUsers } from "@/components/screens/admin-users";
import { AdminWaitlist } from "@/components/screens/admin-waitlist";
import { UserPage } from "@/components/screens/admin-user";
import { AdminProvider } from "@/components/screens/admin-provider";
import { AdminAudit } from "@/components/screens/admin-audit";
import { AdminStorage } from "@/components/screens/admin-storage";
import { AdminSettings } from "@/components/screens/admin-settings";

const SCREENS = {
  overview: Overview,
  playground: Playground,
  jobs: Jobs,
  projects: Projects,
  keys: Keys,
  logs: Logs,
  feedback: Feedback,
  guide: Guide,
  account: Account,
  users: AdminUsers,
  waitlist: AdminWaitlist,
  provider: AdminProvider,
  audit: AdminAudit,
  storage: AdminStorage,
  settings: AdminSettings,
};

export const TITLES = {
  overview: "Overview",
  playground: "Playground",
  jobs: "Search jobs",
  projects: "Projects",
  keys: "API keys",
  logs: "Request logs",
  feedback: "Quality feedback",
  guide: "API guide",
  account: "Account settings",
  users: "Users & invites",
  waitlist: "Waitlist",
  provider: "Provider & rules",
  audit: "Audit history",
  storage: "Storage & retention",
  settings: "Platform settings",
};

export default function Workspace({ audience = "customer" }) {
  const router = useRouter();
  const pathname = usePathname();
  const route = useMemo(() => parseRoute(pathname, audience), [pathname, audience]);
  const [me, setMe] = useState(null),
    [csrf, setCsrf] = useState(""),
    [sessionReady, setSessionReady] = useState(false),
    [intent, setIntent] = useState(null),
    [crumb, setCrumb] = useState(null);
  const [theme, setTheme] = useWorkspaceTheme();

  const call = useCallback(
    async (path, body, options = {}) => {
      let r;
      try {
        r = await fetch(path, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            ...(options.apiKey
              ? { Authorization: `Bearer ${options.apiKey}` }
              : { "X-CSRF-Token": csrf }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch {
        throw Object.assign(new Error("Can’t reach Pluko. Check your connection and try again."), { code: "NETWORK" });
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401 && d.error?.code === "LOGIN_REQUIRED" && path !== "/api/me" && !options.apiKey) {
          setMe(null);
          setCsrf("");
          toast.warning("Your session expired. Please sign in again.");
        }
        throw Object.assign(new Error(d.error?.message || "Request failed"), { code: d.error?.code, status: r.status });
      }
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
    // Only on first load; later calls go through `refresh` directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const href = useCallback((view, id, tab) => routePath(route.base, view, id, tab), [route.base]);
  const navigate = useCallback((view, id, tab, { replace = false } = {}) => {
    const target = routePath(route.base, view, id, tab);
    if (replace) router.replace(target);
    else router.push(target);
  }, [route.base, router]);
  // Opens a page and asks it to start an action, such as the "new project" dialog.
  const start = useCallback((view, action) => {
    setIntent({ view, action, at: Date.now() });
    if (route.view !== view || route.id) navigate(view);
  }, [navigate, route.view, route.id]);
  const takeIntent = useCallback((view, action) => {
    if (intent?.view === view && intent.action === action) {
      setIntent(null);
      return true;
    }
    return false;
  }, [intent]);

  const signOut = useCallback(async () => {
    try { await call("/api/logout", {}); } catch {}
    setMe(null);
    setCsrf("");
    toast.success("Signed out");
  }, [call]);

  const mfaRequired = me?.role === "admin" && !me.mfa;
  const wrongPortal = me && (audience === "admin" ? me.role !== "admin" : me.role === "admin");
  useEffect(() => {
    if (wrongPortal) router.replace(me.role === "admin" ? "/admin" : "/app");
  }, [wrongPortal, me, router]);
  useEffect(() => {
    if (me && mfaRequired && !(route.view === "account" && route.tab === "security")) navigate("account", null, "security", { replace: true });
  }, [me, mfaRequired, route.view, route.tab, navigate]);
  useEffect(() => {
    if (!me) return;
    // Next applies the layout's metadata title after a client navigation, so set ours just after it.
    const title = `${TITLES[route.view] || "Workspace"} — Pluko`;
    document.title = title;
    const timer = setTimeout(() => { document.title = title; }, 60);
    return () => clearTimeout(timer);
  }, [me, route.view, route.id, route.tab]);

  // Detail pages report a readable name (a job's query, a project's name) for the breadcrumb.
  useEffect(() => { setCrumb(null); }, [route.view, route.id]);

  const value = useMemo(() => ({
    me, call, audience, route, href, navigate, start, takeIntent, intent, refreshMe: refresh, signOut, theme, setTheme, mfaRequired, crumb, setCrumb,
  }), [me, call, audience, route, href, navigate, start, takeIntent, intent, refresh, signOut, theme, setTheme, mfaRequired, crumb]);

  if (!sessionReady || wrongPortal)
    return (
      <div className="flex min-h-svh bg-sidebar" aria-busy="true" aria-label="Loading your workspace">
        <div className="hidden w-64 shrink-0 flex-col gap-2 p-4 md:flex">
          <div className="mb-3 flex items-center gap-2 px-1"><img src="/logo.svg" alt="" className="size-8" /><span className="font-semibold">Pluko</span></div>
          <Shimmer className="mb-3 h-9 w-full rounded-xl" />
          {Array.from({ length: 8 }, (_, index) => <Shimmer key={index} className="h-7 w-full" />)}
        </div>
        <div className="m-2 flex flex-1 flex-col gap-8 rounded-xl bg-background p-6 shadow-sm lg:p-10">
          <div className="space-y-3"><Shimmer className="h-4 w-20" /><Shimmer className="h-10 w-72 max-w-full" /></div>
          <div className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((index) => <div key={index} className="grid gap-3 bg-card p-6"><Shimmer className="h-3.5 w-24" /><Shimmer className="h-9 w-20" /></div>)}</div>
          <Shimmer className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  if (!me) return <AuthScreen call={call} onAuthenticated={refresh} adminOnly={audience === "admin"} />;
  const Screen = SCREENS[route.view] || Overview;
  // Until an administrator turns on the authenticator, every other API call is refused, so only Security renders.
  const Detail = mfaRequired ? Account : route.view === "jobs" && route.id ? JobPage : route.view === "projects" && route.id ? ProjectPage : route.view === "users" && route.id ? UserPage : Screen;
  return (
    <WorkspaceContext.Provider value={value}>
      <WorkspaceShell titles={TITLES}>
        <RefreshScope key={`${route.view}/${route.id || ""}`}>
          <div className="page-enter grid gap-6">
            <Detail />
          </div>
        </RefreshScope>
      </WorkspaceShell>
    </WorkspaceContext.Provider>
  );
}
