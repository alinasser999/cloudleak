import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { AcceptButton } from "./accept-button";
import { Backdrop } from "../../../components/backdrop";
import { IconLeaf, IconArrowRight } from "../../../components/icons";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-6">
      <Backdrop />
      <div className="w-full max-w-md rounded-2xl border border-line/10 bg-surface/70 p-8 panel-hairline">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand-bright">
          <IconLeaf className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-[1.7rem] uppercase leading-[0.95] tracking-[0.01em] text-ink sm:text-[1.95rem]">
          You&apos;ve been invited to CloudLeak
        </h1>
        {user ? (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              Signed in as <span className="font-medium text-ink">{user.email}</span>. Accept to join
              the organization.
            </p>
            <div className="mt-5">
              <AcceptButton token={token} />
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">Sign in to accept this invitation.</p>
            <Link
              href={`/login?next=/invite/${token}`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-colors hover:bg-brand-bright"
            >
              Sign in
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
