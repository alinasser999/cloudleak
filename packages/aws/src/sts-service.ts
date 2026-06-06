import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
} from "@aws-sdk/client-sts";
import { AwsValidationError } from "@cloudleak/core";

export interface StsService {
  assumeRole(roleArn: string, externalId: string): Promise<{ accountId: string }>;
}

/** Real implementation: AssumeRole then GetCallerIdentity with the scoped creds. */
export class RealStsService implements StsService {
  constructor(private readonly region = process.env.AWS_REGION ?? "us-east-1") {}

  async assumeRole(roleArn: string, externalId: string): Promise<{ accountId: string }> {
    const base = new STSClient({ region: this.region });
    let creds;
    try {
      const res = await base.send(
        new AssumeRoleCommand({
          RoleArn: roleArn,
          RoleSessionName: "cloudleak-validate",
          ExternalId: externalId,
          DurationSeconds: 900,
        }),
      );
      creds = res.Credentials;
    } catch (e) {
      throw new AwsValidationError(`AssumeRole failed: ${(e as Error).message}`);
    }
    if (!creds?.AccessKeyId || !creds.SecretAccessKey || !creds.SessionToken) {
      throw new AwsValidationError("AssumeRole returned no credentials");
    }
    const scoped = new STSClient({
      region: this.region,
      credentials: {
        accessKeyId: creds.AccessKeyId,
        secretAccessKey: creds.SecretAccessKey,
        sessionToken: creds.SessionToken,
      },
    });
    const id = await scoped.send(new GetCallerIdentityCommand({}));
    if (!id.Account) throw new AwsValidationError("Could not resolve account id");
    return { accountId: id.Account };
  }
}

export interface FakeOptions {
  mode: "success" | "fail";
  accountId?: string;
}

/** Deterministic fake for tests/dev — no live AWS account required. */
export class FakeStsService implements StsService {
  constructor(private readonly opts: FakeOptions) {}

  async assumeRole(_roleArn: string, _externalId: string): Promise<{ accountId: string }> {
    if (this.opts.mode === "fail") throw new AwsValidationError("fake failure");
    return { accountId: this.opts.accountId ?? "000000000000" };
  }
}
