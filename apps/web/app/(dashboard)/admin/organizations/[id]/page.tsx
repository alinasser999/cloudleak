import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AdminOrgDetailClient } from "./org-detail-client";

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isPlatformAdmin())) redirect("/overview");
  const { id } = await params;
  return <AdminOrgDetailClient id={id} />;
}
