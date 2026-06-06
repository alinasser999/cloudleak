import { createUserClient, MembershipRepository, ResourceRepository, type Db } from "@cloudleak/db";
import { ForbiddenError, type Resource } from "@cloudleak/core";

export class ResourceService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
  }

  async list(
    userId: string,
    organizationId: string,
    opts: { awsAccountId?: string } = {},
  ): Promise<Resource[]> {
    await this.assertMember(userId, organizationId);
    return new ResourceRepository(this.db()).listByOrg(organizationId, opts);
  }
}
