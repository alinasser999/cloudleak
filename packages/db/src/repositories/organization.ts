import type { Db } from "../client.js";
import type { Organization, Plan } from "@cloudleak/core";
import { NotFoundError } from "@cloudleak/core";

export class OrganizationRepository {
  constructor(private readonly db: Db) {}

  async create(name: string): Promise<Organization> {
    const { data, error } = await this.db
      .from("organizations")
      .insert({ name })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return { id: data.id, name: data.name, plan: data.plan as Plan, createdAt: data.created_at };
  }

  async getById(id: string): Promise<Organization> {
    const { data, error } = await this.db
      .from("organizations")
      .select()
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundError("Organization not found");
    return { id: data.id, name: data.name, plan: data.plan as Plan, createdAt: data.created_at };
  }
}
