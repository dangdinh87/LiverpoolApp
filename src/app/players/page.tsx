import { redirect } from "next/navigation";

export default function PlayersPage() {
  redirect("/squad?tab=stats");
}
