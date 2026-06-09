-- Scan schedules: one row per (org, aws_account) pair
CREATE TABLE IF NOT EXISTS scan_schedules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  aws_account_id   uuid NOT NULL REFERENCES aws_accounts(id) ON DELETE CASCADE,
  frequency        text NOT NULL DEFAULT 'off' CHECK (frequency IN ('off', 'daily', 'weekly')),
  enabled          boolean NOT NULL DEFAULT true,
  next_scan_at     timestamptz,
  last_scan_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, aws_account_id)
);

-- RLS: members can read, admins/owners can write (service role bypasses for worker)
ALTER TABLE scan_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view schedules"
  ON scan_schedules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins can manage schedules"
  ON scan_schedules FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Index for the worker's due-schedule query
CREATE INDEX IF NOT EXISTS scan_schedules_due
  ON scan_schedules (next_scan_at)
  WHERE enabled = true AND frequency != 'off';
