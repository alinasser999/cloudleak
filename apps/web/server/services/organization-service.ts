import { createServiceClient, OrganizationRepository, MembershipRepository } from "@cloudleak/db";
import { ValidationError, type Organization } from "@cloudleak/core";

export class OrganizationService {
  /** Creates an org and makes the given user its owner. Uses service-role (RLS bypass). */
  static async createWithOwner(userId: string, name: string): Promise<Organization> {
    const trimmed = name.trim();
    if (trimmed.length < 2) throw new ValidationError("Organization name is too short");
    const db = createServiceClient();
    const org = await new OrganizationRepository(db).create(trimmed);
    await new MembershipRepository(db).create(org.id, userId, "owner");
    return org;
  }
}
