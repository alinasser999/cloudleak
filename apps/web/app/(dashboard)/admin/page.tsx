import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AdminOverviewClient } from "./overview-client";

export default async function AdminOverviewPage() {
  if (!(await isPlatformAdmin())) redirect("/overview");
  return <AdminOverviewClient />;
}
