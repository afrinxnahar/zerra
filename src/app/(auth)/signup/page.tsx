import { env } from "@/lib/env";
import { SignupForm } from "@/components/AuthForm";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { role } = await searchParams;
  return (
    <>
      <div className="mb-8 text-center">
        <div className="eyebrow">Get started</div>
        <h1 className="display mt-3 text-4xl">Create your account</h1>
        <p className="mt-3 text-sm text-muted">Creators send spec ads. Brands watch them.</p>
      </div>
      <div className="card p-6 sm:p-8">
        <SignupForm initialRole={role === "brand" ? "brand" : "creator"} providers={env.authProviders} />
      </div>
    </>
  );
}
