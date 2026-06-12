import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AdminAuditClient } from "./audit-client";

export default async function AdminAuditPage() {
  if (!(await isPlatformAdmin())) redirect("/overview");
  return <AdminAuditClient />;
}
