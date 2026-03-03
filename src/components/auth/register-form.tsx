"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { registerWithEmail } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await registerWithEmail(formData);
      if (result?.error) setError(result.error);
      if (result?.success) setSuccess(result.success);
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-stadium-surface border border-stadium-border rounded-2xl p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-10 h-10 bg-lfc-red rounded-full flex items-center justify-center font-bebas text-white mx-auto mb-4">
            LFC
          </div>
          <h1 className="font-bebas text-3xl text-white tracking-wider">Create Account</h1>
          <p className="font-inter text-stadium-muted text-sm mt-1">Join the LFC community</p>
        </div>

        {success ? (
          <div className="text-center">
            <p className="text-green-400 font-inter text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 mb-6">
              {success}
            </p>
            <Link
              href="/auth/login"
              className="font-inter text-lfc-red hover:underline text-sm font-medium"
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <form action={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={cn(
                    "w-full bg-stadium-bg border border-stadium-border rounded-lg px-3 py-2.5 text-white font-inter text-sm",
                    "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
                  )}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    minLength={6}
                    className={cn(
                      "w-full bg-stadium-bg border border-stadium-border rounded-lg px-3 py-2.5 pr-10 text-white font-inter text-sm",
                      "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
                    )}
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stadium-muted hover:text-white transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
                  Confirm Password
                </label>
                <input
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className={cn(
                    "w-full bg-stadium-bg border border-stadium-border rounded-lg px-3 py-2.5 text-white font-inter text-sm",
                    "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
                  )}
                  placeholder="Repeat password"
                />
              </div>

              {error && (
                <p className="text-red-400 font-inter text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-lfc-red hover:bg-lfc-red-dark text-white font-inter font-semibold mt-1"
              >
                {isPending ? "Creating account…" : "Create Account"}
              </Button>
            </form>

            <p className="text-center font-inter text-sm text-stadium-muted mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-lfc-red hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
