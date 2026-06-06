-- Harden SECURITY DEFINER functions so they are not callable via the public REST RPC
-- surface by anonymous users.

-- handle_new_user() is only ever invoked by the on_auth_user_created trigger
-- (trigger execution does not require EXECUTE on the invoking role), so revoke
-- EXECUTE from everyone.
revoke all on function public.handle_new_user() from public;

-- current_user_org_ids() is used inside RLS policies and must remain executable by
-- the authenticated role, but should not be reachable by anon. Revoking from PUBLIC
-- drops the implicit anon grant; we then re-grant only to authenticated. The function
-- returns only the caller's own memberships (keyed on auth.uid()), so this is safe.
revoke all on function public.current_user_org_ids() from public;
grant execute on function public.current_user_org_ids() to authenticated;
