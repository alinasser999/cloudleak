import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { AcceptButton } from "./accept-button";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">You&apos;ve been invited to CloudLeak</h1>
      {user ? (
        <>
          <p className="text-sm text-ink/60">
            Signed in as {user.email}. Accept to join the organization.
          </p>
          <AcceptButton token={token} />
        </>
      ) : (
        <>
          <p className="text-sm text-ink/60">Sign in to accept this invitation.</p>
          <Link
            href={`/login?next=/invite/${token}`}
            className="rounded-lg bg-ink px-4 py-2 text-center text-sm font-semibold text-white hover:bg-ink/90"
          >
            Sign in
          </Link>
        </>
      )}
    </main>
  );
}
