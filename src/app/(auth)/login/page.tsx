import { env } from "@/lib/env";
import { LoginForm } from "@/components/AuthForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <>
      <div className="mb-8 text-center">
        <div className="eyebrow">Welcome back</div>
        <h1 className="display mt-3 text-4xl">Log in to Zerra</h1>
      </div>
      <div className="card p-6 sm:p-8">
        <LoginForm providers={env.authProviders} error={typeof error === "string" ? error : undefined} />
      </div>
    </>
  );
}
