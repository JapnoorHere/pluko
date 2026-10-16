import Workspace from "@/components/workspace";
import { ThemeScript } from "@/components/workspace/theme";

export const metadata = {
  title: { default: "Workspace — Pluko", template: "%s — Pluko" },
  robots: { index: false, follow: false },
};

// Rendered once for every /app/* URL; the page segment is empty and the workspace reads the URL itself.
export default function WorkspaceLayout() {
  return <><ThemeScript /><Workspace /></>;
}
