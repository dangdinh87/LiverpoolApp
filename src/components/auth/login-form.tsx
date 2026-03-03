"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Chrome } from "lucide-react";
import { loginWithEmail } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    });
  }

  function handleSubmit(formData: FormData) {
    formData.set("redirectTo", redirectTo);
    setError(null);
    startTransition(async () => {
      const result = await loginWithEmail(formData);
      if (result?.error) setError(result.error);
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
          <h1 className="font-bebas text-3xl text-white tracking-wider">Welcome Back</h1>
          <p className="font-inter text-stadium-muted text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-stadium-border rounded-lg text-white font-inter text-sm font-medium hover:bg-stadium-surface2 transition-colors mb-6"
        >
          <Chrome size={18} />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-stadium-border" />
          <span className="font-inter text-xs text-stadium-muted">or</span>
          <div className="flex-1 h-px bg-stadium-border" />
        </div>

        {/* Email/password form */}
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
                autoComplete="current-password"
                className={cn(
                  "w-full bg-stadium-bg border border-stadium-border rounded-lg px-3 py-2.5 pr-10 text-white font-inter text-sm",
                  "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
                )}
                placeholder="••••••••"
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
            {isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="text-center font-inter text-sm text-stadium-muted mt-6">
          No account?{" "}
          <Link href="/auth/register" className="text-lfc-red hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
