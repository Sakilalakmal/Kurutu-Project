"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { authClient } from "@/app/lib/auth-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const resolveErrorMessage = (error: string | null) => {
  if (!error) {
    return null;
  }

  if (error === "google_signin_failed") {
    return "Google sign-in failed. Please try again.";
  }

  return "Unable to sign in right now. Please try again.";
};

const mockFields = [
  { label: "First Name", value: "Alice" },
  { label: "Last Name", value: "Caroline" },
  { label: "Email", value: "alice_login@gmail.com" },
];

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative">
      <span className="absolute -top-2 left-4 bg-black px-2 text-[10px] text-zinc-500">{label}</span>
      <div className="flex h-11 items-center rounded-2xl border border-zinc-800 px-4 text-sm text-zinc-300">
        {value}
      </div>
    </div>
  );
}

export function AuthCard() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const queryError = useMemo(
    () => resolveErrorMessage(searchParams.get("error")),
    [searchParams]
  );
  const activeError = clientError ?? queryError;

  const handleGoogleSignIn = async () => {
    setClientError(null);
    setIsLoading(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/home",
      errorCallbackURL: "/login?error=google_signin_failed",
    });

    if (result.error) {
      setClientError("Unable to start Google sign-in. Please retry.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] space-y-5 p-2">
      <header className="space-y-3">
        <h1 className="text-5xl font-semibold tracking-tight text-zinc-100">Sign in</h1>
        <p className="max-w-xs text-sm leading-6 text-zinc-500">
          Continue with Google to access Kurutu. Your account is protected with secure OAuth.
        </p>
      </header>

      {activeError ? (
        <Alert variant="destructive" className="border-red-400/30 bg-red-950/40 text-red-100">
          <AlertCircle className="size-4" />
          <AlertTitle>Sign-in error</AlertTitle>
          <AlertDescription>{activeError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        {mockFields.map((field) => (
          <MockField key={field.label} label={field.label} value={field.value} />
        ))}
      </div>

      <Button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="h-12 w-full rounded-full bg-zinc-100 text-[15px] font-semibold text-zinc-900 shadow-[0_8px_28px_-20px_rgba(255,255,255,0.7)] hover:bg-zinc-200 motion-safe:hover:-translate-y-0.5"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Redirecting...
          </>
        ) : (
          "Log In"
        )}
      </Button>

      <div className="flex items-center gap-4 text-xs text-zinc-600">
        <span className="h-px flex-1 bg-zinc-900" />
        or
        <span className="h-px flex-1 bg-zinc-900" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          variant="secondary"
          className="h-11 rounded-full bg-[#131821] text-zinc-200 hover:bg-[#171d29]"
        >
          Google
        </Button>
        <Button
          type="button"
          disabled
          variant="secondary"
          className="h-11 rounded-full bg-[#131821] text-zinc-500"
        >
          Facebook
        </Button>
      </div>
    </div>
  );
}
