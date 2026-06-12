import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AdminUserDetailClient } from "./user-detail-client";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isPlatformAdmin())) redirect("/overview");
  const { id } = await params;
  return <AdminUserDetailClient id={id} />;
}
