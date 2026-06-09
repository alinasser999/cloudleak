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

export type ScanStatus = "queued" | "running" | "success" | "error";

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

export type FindingType =
  | "stopped_ec2"
  | "unattached_ebs"
  | "old_snapshot"
  | "unattached_eip"
  | "stopped_rds";

export type FindingSeverity = "low" | "medium" | "high" | "critical";
export type FindingStatus = "open" | "dismissed";

export interface DashboardSummary {
  totalMonthlySavings: number;
  openFindingsCount: number;
  dismissedFindingsCount: number;
  findingsBySeverity: Record<string, number>;
  findingsByType: Record<string, number>;
  resourceCount: number;
  resourcesByType: Record<string, number>;
  totalResourceCost: number;
  lastScanAt: string | null;
  recentScans: Scan[];
  connectedAccountCount: number;
}

export interface NewFindingRow {
  organizationId: string;
  awsAccountId: string;
  resourceId: string;
  findingType: FindingType;
  severity: FindingSeverity;
  estimatedMonthlySavings: number;
  title: string;
  description: string;
  status: FindingStatus;
  terraformFix?: string;
  manualFix?: string;
}

export interface Finding {
  id: string;
  organizationId: string;
  awsAccountId: string;
  resourceId: string | null;
  findingType: FindingType;
  severity: FindingSeverity;
  estimatedMonthlySavings: number | null;
  title: string;
  description: string | null;
  status: FindingStatus;
  terraformFix: string | null;
  manualFix: string | null;
  createdAt: string;
}
