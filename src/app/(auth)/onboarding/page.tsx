import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/AuthForm";

export const metadata = { title: "Finish signing up" };

/** OAuth sign-ins don't carry a role, so their first stop is here. */
export default async function OnboardingPage() {
  const auth = await getAuthUser();
  if (!auth) redirect("/login");
  return (
    <>
      <div className="mb-8 text-center">
        <div className="eyebrow">One more step</div>
        <h1 className="display mt-3 text-4xl">How will you use Zerra?</h1>
        <p className="mt-3 text-sm text-muted">Signed in as {auth.email}</p>
      </div>
      <div className="card p-6 sm:p-8">
        <OnboardingForm />
      </div>
    </>
  );
}
