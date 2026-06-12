import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage() {
  if (!(await isPlatformAdmin())) redirect("/overview");
  return <AdminUsersClient />;
}
