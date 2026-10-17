import { PublicShell } from "@/components/site/ui";
import { StatusBoard } from "@/components/site/status-board";

export const metadata = {
  title: "Status — Pluko",
  description: "Is Pluko working right now? A live check of the API, the search worker, and the image source.",
};

export default function Status() {
  return (
    <PublicShell>
      <StatusBoard />
    </PublicShell>
  );
}
