import { redirect } from "next/navigation";
import { getActiveMembership } from "@/lib/org";
import { Panel, PageHeading } from "@/components/ui";
import { IconShield } from "@/components/icons";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const membership = await getActiveMembership();
  if (!membership) redirect("/onboarding");

  if (membership.role !== "owner" && membership.role !== "admin") {
    return <TeamRestricted />;
  }

  return (
    <MembersClient organizationId={membership.organizationId} currentUserId={membership.userId} />
  );
}

function TeamRestricted() {
  return (
    <div className="max-w-2xl space-y-7">
      <PageHeading title="Team">
        Everyone with access to this organization, and any invites still awaiting acceptance.
      </PageHeading>
      <Panel className="p-10 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand-bright">
          <IconShield className="h-5 w-5" />
        </span>
        <p className="mt-4 text-sm font-medium text-ink">Admins only</p>
        <p className="mt-1 text-xs text-ink-muted">
          Only owners and admins can view the team roster and pending invites. Ask an organization
          owner if you need access.
        </p>
      </Panel>
    </div>
  );
}
