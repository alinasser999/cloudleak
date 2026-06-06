export interface RoleTerraformOptions {
  externalId: string;
  cloudleakAccountId: string;
  roleName: string;
}

/** Renders the read-only cross-account IAM role module the customer applies. */
export function renderRoleTerraform(o: RoleTerraformOptions): string {
  return `# CloudLeak read-only cross-account role.
# Apply this, then paste the output role_arn back into CloudLeak.

resource "aws_iam_role" "cloudleak" {
  name = "${o.roleName}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${o.cloudleakAccountId}:root" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "sts:ExternalId" = "${o.externalId}" } }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cloudleak_readonly" {
  role       = aws_iam_role.cloudleak.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

output "role_arn" {
  value = aws_iam_role.cloudleak.arn
}
`;
}
