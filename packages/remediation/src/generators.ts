import type { FindingType, Resource } from "@cloudleak/core";

export interface RemediationOutput {
  terraform: string;
  manual: string;
}

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "_");
}

function stoppedEc2(resource: Resource): RemediationOutput {
  const id = resource.resourceId;
  const region = resource.region;
  const name = `stopped_${safeId(id)}`;
  return {
    terraform: `# Terraform ≥ 1.5 — import then remove to terminate the instance.
# Provider must be configured for region: ${region}

import {
  to = aws_instance.${name}
  id = "${id}"
}

# Run: terraform plan
# Then delete this resource block and run: terraform apply
# The instance will be terminated.
resource "aws_instance" "${name}" {
  ami           = "placeholder"   # populated after import
  instance_type = "placeholder"
}`,
    manual: `1. Verify instance ${id} (${region}) is no longer needed.
2. Back up any data on attached EBS volumes.
3. aws ec2 terminate-instances --instance-ids ${id} --region ${region}`,
  };
}

function unattachedEbs(resource: Resource): RemediationOutput {
  const id = resource.resourceId;
  const region = resource.region;
  const name = `unattached_${safeId(id)}`;
  return {
    terraform: `# Terraform ≥ 1.5 — import then remove to delete the volume.
# Provider must be configured for region: ${region}

import {
  to = aws_ebs_volume.${name}
  id = "${id}"
}

# Run: terraform plan
# Then delete this resource block and run: terraform apply
# The volume will be permanently deleted.
resource "aws_ebs_volume" "${name}" {
  availability_zone = "placeholder"   # populated after import
}`,
    manual: `1. Verify volume ${id} (${region}) is not needed.
2. (Optional) Snapshot first: aws ec2 create-snapshot --volume-id ${id} --description "final-backup" --region ${region}
3. aws ec2 delete-volume --volume-id ${id} --region ${region}`,
  };
}

function oldSnapshot(resource: Resource): RemediationOutput {
  const id = resource.resourceId;
  const region = resource.region;
  const name = `old_${safeId(id)}`;
  return {
    terraform: `# Terraform ≥ 1.5 — import then remove to delete the snapshot.
# Provider must be configured for region: ${region}

import {
  to = aws_ebs_snapshot.${name}
  id = "${id}"
}

# Run: terraform plan
# Then delete this resource block and run: terraform apply
# The snapshot will be permanently deleted.
resource "aws_ebs_snapshot" "${name}" {
  volume_id = "placeholder"   # populated after import
}`,
    manual: `1. Verify snapshot ${id} (${region}) is no longer needed.
2. aws ec2 delete-snapshot --snapshot-id ${id} --region ${region}`,
  };
}

function unattachedEip(resource: Resource): RemediationOutput {
  const id = resource.resourceId;
  const region = resource.region;
  const name = `unattached_${safeId(id)}`;
  return {
    terraform: `# Terraform ≥ 1.5 — import then remove to release the Elastic IP.
# Provider must be configured for region: ${region}

import {
  to = aws_eip.${name}
  id = "${id}"
}

# Run: terraform plan
# Then delete this resource block and run: terraform apply
# The Elastic IP will be released.
resource "aws_eip" "${name}" {
  domain = "vpc"
}`,
    manual: `1. Verify Elastic IP ${id} (${region}) is not in use.
2. aws ec2 release-address --allocation-id ${id} --region ${region}`,
  };
}

function stoppedRds(resource: Resource): RemediationOutput {
  const id = resource.resourceId;
  const region = resource.region;
  const name = `stopped_${safeId(id)}`;
  return {
    terraform: `# Terraform ≥ 1.5 — import then remove to delete the DB instance.
# Provider must be configured for region: ${region}

import {
  to = aws_db_instance.${name}
  id = "${id}"
}

# Run: terraform plan
# Then delete this resource block and run: terraform apply
# The DB instance will be deleted (skip_final_snapshot = true).
resource "aws_db_instance" "${name}" {
  instance_class      = "placeholder"   # populated after import
  engine              = "placeholder"
  allocated_storage   = 20
  skip_final_snapshot = true
}`,
    manual: `1. (Recommended) Create a final snapshot before deletion:
   aws rds create-db-snapshot --db-instance-identifier ${id} --db-snapshot-identifier ${id}-final --region ${region}
2. aws rds delete-db-instance --db-instance-identifier ${id} --skip-final-snapshot --region ${region}`,
  };
}

export function generateRemediation(
  findingType: FindingType,
  resource: Resource,
): RemediationOutput {
  switch (findingType) {
    case "stopped_ec2":
      return stoppedEc2(resource);
    case "unattached_ebs":
      return unattachedEbs(resource);
    case "old_snapshot":
      return oldSnapshot(resource);
    case "unattached_eip":
      return unattachedEip(resource);
    case "stopped_rds":
      return stoppedRds(resource);
  }
}
