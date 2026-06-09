import {
  createUserClient,
  FindingRepository,
  MembershipRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, type Finding, type FindingStatus } from "@cloudleak/core";

export class FindingService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
  }

  async list(userId: string, organizationId: string): Promise<Finding[]> {
    await this.assertMember(userId, organizationId);
    return new FindingRepository(this.db()).listByOrg(organizationId);
  }

  async setStatus(
    id: string,
    userId: string,
    organizationId: string,
    status: FindingStatus,
  ): Promise<Finding> {
    await this.assertMember(userId, organizationId);
    return new FindingRepository(this.db()).updateStatus(id, organizationId, status);
  }
}
