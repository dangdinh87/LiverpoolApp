"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { loginWithEmail, registerWithEmail } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Mode = "login" | "register";

interface LoginFormProps {
  defaultMode?: Mode;
}

export function LoginForm({ defaultMode = "login" }: LoginFormProps) {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tLogin = useTranslations("Auth.login");
  const tRegister = useTranslations("Auth.register");
  const t = mode === "login" ? tLogin : tRegister;

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setSuccess(null);
  }

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
    setError(null);

    if (mode === "register") {
      const password = String(formData.get("password") ?? "");
      const confirm = String(formData.get("confirm") ?? "");
      if (password !== confirm) {
        setError(tRegister("confirmMismatch"));
        return;
      }
      if (password.length < 6) {
        setError(tRegister("passwordShort"));
        return;
      }
    }

    formData.set("redirectTo", redirectTo);
    startTransition(async () => {
      if (mode === "login") {
        const result = await loginWithEmail(formData);
        if (result?.error) setError(result.error);
      } else {
        const result = await registerWithEmail(formData);
        if (result?.error) setError(result.error);
        if (result?.success) setSuccess(result.success);
      }
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-stadium-surface border border-stadium-border rounded-none p-8">
        {/* Header with LFC crest */}
        <div className="mb-8 text-center">
          <Image
            src="/assets/lfc/crest.webp"
            alt="Liverpool FC"
            width={48}
            height={60}
            className="mx-auto mb-4 h-[60px] w-auto"
          />
          <h1 className="font-bebas text-[2.2rem] text-white tracking-[0.04em]">
            {t("title")}
          </h1>
          <p className="font-inter text-stadium-muted text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* Registration success */}
        {mode === "register" && success ? (
          <div className="text-center">
            <p className="text-green-400 font-inter text-sm bg-green-500/10 border border-green-500/20 rounded-none px-4 py-3 mb-6">
              {success}
            </p>
            <button
              onClick={() => { setMode("login"); setSuccess(null); }}
              className="font-inter text-lfc-red hover:underline text-sm font-medium cursor-pointer"
            >
              ← {tRegister("login")}
            </button>
          </div>
        ) : (
          <>
            {/* Google OAuth — login only */}
            {mode === "login" && (
              <>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-stadium-border rounded-none text-white font-barlow font-semibold uppercase tracking-[0.12em] text-sm hover:bg-stadium-surface2 transition-colors mb-6 cursor-pointer"
                >
                  {/* Google "G" SVG */}
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {tLogin("google")}
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-stadium-border" />
                  <span className="font-inter text-xs text-stadium-muted">{tLogin("or")}</span>
                  <div className="flex-1 h-px bg-stadium-border" />
                </div>
              </>
            )}

            {/* Form */}
            <form action={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
                  {t("email")}
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={cn(
                    "w-full bg-stadium-bg border border-stadium-border rounded-none px-3 py-2.5 text-white font-inter text-sm",
                    "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
                  )}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
                  {t("password")}
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={mode === "register" ? 6 : undefined}
                    className={cn(
                      "w-full bg-stadium-bg border border-stadium-border rounded-none px-3 py-2.5 pr-10 text-white font-inter text-sm",
                      "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stadium-muted hover:text-white transition-colors cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password — register only */}
              {mode === "register" && (
                <div>
                  <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
                    {tRegister("confirm")}
                  </label>
                  <input
                    name="confirm"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    className={cn(
                      "w-full bg-stadium-bg border border-stadium-border rounded-none px-3 py-2.5 text-white font-inter text-sm",
                      "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
                    )}
                    placeholder="••••••••"
                  />
                </div>
              )}

              {error && (
                <p className="text-red-400 font-inter text-sm bg-red-500/10 border border-red-500/20 rounded-none px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow font-bold uppercase tracking-[0.12em] mt-1"
              >
                {isPending ? t("loading") : t("button")}
              </Button>
            </form>

            {/* Toggle login/register */}
            <p className="text-center font-inter text-sm text-stadium-muted mt-6">
              {mode === "login" ? tLogin("noAccount") : tRegister("hasAccount")}{" "}
              <button
                onClick={switchMode}
                className="text-lfc-red hover:underline font-medium cursor-pointer"
              >
                {mode === "login" ? tLogin("register") : tRegister("login")}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
