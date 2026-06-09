import {
  createServiceClient,
  AwsAccountRepository,
  FindingRepository,
  ResourceRepository,
} from "@cloudleak/db";
import { runScan } from "@cloudleak/collectors";
import { runDetection } from "@cloudleak/rules";
import {
  FakeAwsInventoryClient,
  RealAwsInventoryClient,
  RealAwsClientFactory,
} from "@cloudleak/aws";
import type { Scan } from "@cloudleak/core";
import { LinkedScanRepo } from "./linked-scan-repo.js";

function regions(): string[] {
  return (process.env.CLOUDLEAK_SCAN_REGIONS ?? "us-east-1")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function processScan(scan: Scan): Promise<void> {
  const db = createServiceClient();
  const acct = await new AwsAccountRepository(db).getById(scan.awsAccountId, scan.organizationId);

  let client;
  if (process.env.CLOUDLEAK_FAKE_AWS === "1") {
    client = FakeAwsInventoryClient.demo();
  } else {
    if (!acct.roleArn) throw new Error(`Account ${acct.id} has no roleArn`);
    const r = regions()[0] ?? "us-east-1";
    const creds = await new RealAwsClientFactory().assumeRole({
      roleArn: acct.roleArn,
      externalId: acct.externalId,
      region: r,
    });
    client = new RealAwsInventoryClient(creds);
  }

  await runScan({
    awsAccount: { id: acct.id, organizationId: scan.organizationId },
    regions: regions(),
    client,
    resourceRepo: new ResourceRepository(db),
    scanRepo: new LinkedScanRepo(db, scan.id),
  });

  try {
    await runDetection({
      awsAccount: { id: acct.id, organizationId: scan.organizationId },
      resourceRepo: new ResourceRepository(db),
      findingRepo: new FindingRepository(db),
    });
  } catch (e) {
    console.error("Detection failed (non-fatal):", e);
  }
}
