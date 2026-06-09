export type Role = "owner" | "admin" | "member";
export type AwsAccountStatus = "pending" | "connected" | "error";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type Plan = "starter" | "growth" | "agency";

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  createdAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  token: string;
  status: InviteStatus;
  expiresAt: string;
  invitedBy: string | null;
}

export interface AwsAccount {
  id: string;
  organizationId: string;
  accountId: string | null;
  roleArn: string | null;
  externalId: string;
  status: AwsAccountStatus;
  lastValidatedAt: string | null;
}

export type ResourceType =
  | "ec2_instance"
  | "ebs_volume"
  | "ebs_snapshot"
  | "elastic_ip"
  | "rds_instance"
  | "load_balancer";

export type ScanStatus = "running" | "success" | "error";

/** What a collector emits, before persistence. */
export interface NormalizedResource {
  resourceType: ResourceType;
  resourceId: string;
  region: string;
  metadata: Record<string, unknown>;
  estimatedMonthlyCost: number;
}

/** A persistable resource row (camelCase; repository maps to snake_case). */
export interface NewResourceRow {
  organizationId: string;
  awsAccountId: string;
  resourceId: string;
  resourceType: ResourceType;
  region: string;
  metadata: Record<string, unknown>;
  estimatedMonthlyCost: number;
}

export interface Resource {
  id: string;
  organizationId: string;
  awsAccountId: string;
  resourceId: string;
  resourceType: ResourceType;
  region: string;
  metadata: Record<string, unknown>;
  estimatedMonthlyCost: number | null;
  createdAt: string;
}

export interface ScanStats {
  resourceCounts: Partial<Record<ResourceType, number>>;
  totalMonthlyCost: number;
  errors: string[];
}

export interface Scan {
  id: string;
  organizationId: string;
  awsAccountId: string;
  status: ScanStatus;
  startedAt: string | null;
  finishedAt: string | null;
  stats: ScanStats;
  createdAt: string;
}
