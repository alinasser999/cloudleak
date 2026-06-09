# Deploying CloudLeak to Production

## Architecture

```
Internet → ALB (HTTPS) → ECS Fargate: web (Next.js :3000)
                       → ECS Fargate: worker (Node.js poll loop)
Both services → Supabase (managed Postgres + Auth)
Web → Stripe (billing)
Web/Worker → AWS (customer accounts via cross-account IAM roles)
```

## Prerequisites

- AWS account with permissions to create ECR, ECS, ALB, IAM, CloudWatch
- Supabase project (production)
- Stripe account with products created
- Domain + ACM certificate
- Terraform >= 1.5

---

## Step 1: Supabase Setup

1. Create a production Supabase project at supabase.com
2. Run all migrations from your local DB via the Supabase dashboard SQL editor
3. Note the following values from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Stripe Setup

1. Create two products in Stripe Dashboard:
   - **Growth** — $49/month recurring
   - **Agency** — $149/month recurring
2. Copy the Price IDs (not the Product IDs — the IDs starting with `price_`)
3. Configure the webhook endpoint:
   - URL: `https://your-domain.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Note the Webhook Signing Secret

---

## Step 3: Terraform Infrastructure

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # create this file with your values
terraform init
terraform plan
terraform apply
```

Example `terraform.tfvars`:
```hcl
vpc_id             = "vpc-xxxxxxxxx"
public_subnet_ids  = ["subnet-aaa", "subnet-bbb"]
private_subnet_ids = ["subnet-ccc", "subnet-ddd"]
certificate_arn    = "arn:aws:acm:us-east-1:123456789012:certificate/..."

web_env_vars = {
  NEXT_PUBLIC_SUPABASE_URL       = "https://xxx.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY  = "eyJ..."
  # NOTE: put secrets in AWS Secrets Manager and reference via secretsManager in task def
  # For simplicity, env vars work too for non-secret config
}
```

After `terraform apply`, note:
- `alb_dns_name` → point your DNS CNAME here
- `ecr_web_url` and `ecr_worker_url` → set as `AWS_ACCOUNT_ID` GitHub secret

---

## Step 4: GitHub Secrets

In your GitHub repository → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|--------|-------|
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for GitHub OIDC deployments |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for integration tests) |

### GitHub OIDC role (for deploy workflow)

Create an IAM role that allows GitHub Actions to assume it via OIDC:

```hcl
resource "aws_iam_role" "github_deploy" {
  name = "cloudleak-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = "arn:aws:iam::${var.account_id}:oidc-provider/token.actions.githubusercontent.com" }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:YOUR_ORG/cloudleak:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "github_ecr" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_role_policy" "github_ecs" {
  role = aws_iam_role.github_deploy.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ecs:UpdateService"]
      Resource = "*"
    }]
  })
}
```

---

## Step 5: First Deploy

Push to `master` — the CI workflow runs typecheck + tests, then the deploy workflow builds Docker images, pushes to ECR, and force-redeploys ECS services.

```bash
git push origin master
```

Watch progress in GitHub Actions and the ECS console.

---

## Step 6: Environment Variables on ECS

The Terraform `web_env_vars` and `worker_env_vars` variables inject env vars into the task definitions. For production secrets (Stripe key, Supabase service role), use AWS Secrets Manager:

1. Create secrets in Secrets Manager:
   ```bash
   aws secretsmanager create-secret --name cloudleak/stripe-secret-key --secret-string "sk_live_..."
   aws secretsmanager create-secret --name cloudleak/supabase-service-role --secret-string "eyJ..."
   ```

2. Grant the ECS execution role access:
   ```hcl
   resource "aws_iam_role_policy" "ecs_exec_secrets" {
     role = aws_iam_role.ecs_exec.name
     policy = jsonencode({
       Version = "2012-10-17"
       Statement = [{
         Effect   = "Allow"
         Action   = ["secretsmanager:GetSecretValue"]
         Resource = "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:cloudleak/*"
       }]
     })
   }
   ```

3. Reference them in the task definition `secrets` array instead of `environment`.

---

## Step 7: Resend (Email Digest)

1. Sign up at resend.com
2. Add and verify your sending domain
3. Create an API key
4. Set env vars:
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM=CloudLeak <digest@yourdomain.com>
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

To automate weekly digests, create a scheduled job (AWS EventBridge + Lambda, or a cron in your worker) that POSTs to `/api/reports/digest` for each active organization.

---

## Local Development

```bash
# Install dependencies
pnpm install

# Start web app
pnpm --filter @cloudleak/web dev

# Start worker (fake AWS)
CLOUDLEAK_FAKE_AWS=1 pnpm --filter @cloudleak/worker dev

# Or run both via Docker Compose (requires .env file)
cp .env.local .env
docker-compose up --build
```

## Running Tests

```bash
pnpm test          # all packages (integration tests skipped without Supabase creds)
pnpm typecheck     # TypeScript across all packages
```
