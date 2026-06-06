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
