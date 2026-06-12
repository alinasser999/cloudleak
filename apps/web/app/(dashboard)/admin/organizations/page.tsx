import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AdminOrgsClient } from "./orgs-client";

export default async function AdminOrgsPage() {
  if (!(await isPlatformAdmin())) redirect("/overview");
  return <AdminOrgsClient />;
}
