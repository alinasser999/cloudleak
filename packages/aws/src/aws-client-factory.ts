import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { AwsValidationError } from "@cloudleak/core";

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface AssumeRoleInput {
  roleArn: string;
  externalId: string;
  region: string;
}

export interface AwsClientFactory {
  assumeRole(input: AssumeRoleInput): Promise<AwsCredentials>;
}

/** Assumes the customer's cross-account role and returns scoped temp credentials. */
export class RealAwsClientFactory implements AwsClientFactory {
  async assumeRole({ roleArn, externalId, region }: AssumeRoleInput): Promise<AwsCredentials> {
    const sts = new STSClient({ region });
    const res = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: "cloudleak-scan",
        ExternalId: externalId,
        DurationSeconds: 3600,
      }),
    );
    const c = res.Credentials;
    if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) {
      throw new AwsValidationError("AssumeRole returned no credentials");
    }
    return {
      accessKeyId: c.AccessKeyId,
      secretAccessKey: c.SecretAccessKey,
      sessionToken: c.SessionToken,
    };
  }
}
