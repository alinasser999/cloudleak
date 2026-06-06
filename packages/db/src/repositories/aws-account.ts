import type { Db } from "../client.js";
import type { AwsAccount, AwsAccountStatus } from "@cloudleak/core";
import { NotFoundError } from "@cloudleak/core";

type AwsAccountRow = {
  id: string;
  organization_id: string;
  account_id: string | null;
  role_arn: string | null;
  external_id: string;
  status: string;
  last_validated_at: string | null;
};

const map = (d: AwsAccountRow): AwsAccount => ({
  id: d.id,
  organizationId: d.organization_id,
  accountId: d.account_id,
  roleArn: d.role_arn,
  externalId: d.external_id,
  status: d.status as AwsAccountStatus,
  lastValidatedAt: d.last_validated_at,
});

export class AwsAccountRepository {
  constructor(private readonly db: Db) {}

  async createPending(organizationId: string, externalId: string): Promise<AwsAccount> {
    const { data, error } = await this.db
      .from("aws_accounts")
      .insert({ organization_id: organizationId, external_id: externalId, status: "pending" })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return map(data);
  }

  async getById(id: string, organizationId: string): Promise<AwsAccount> {
    const { data } = await this.db
      .from("aws_accounts")
      .select()
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!data) throw new NotFoundError("AWS account not found");
    return map(data);
  }

  async listForOrg(organizationId: string): Promise<AwsAccount[]> {
    const { data, error } = await this.db
      .from("aws_accounts")
      .select()
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(map);
  }

  async markConnected(id: string, accountId: string, roleArn: string): Promise<AwsAccount> {
    const { data, error } = await this.db
      .from("aws_accounts")
      .update({
        account_id: accountId,
        role_arn: roleArn,
        status: "connected",
        last_validated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "update failed");
    return map(data);
  }

  async markError(id: string): Promise<void> {
    await this.db.from("aws_accounts").update({ status: "error" }).eq("id", id);
  }
}
