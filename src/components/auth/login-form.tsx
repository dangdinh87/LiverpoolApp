"use client";

import { useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { loadSupabaseClient } from "@/lib/supabase-lazy";
import { getSafeRedirect } from "@/lib/safe-redirect";
import { toAuthErrorCode } from "@/lib/auth-error-code";
import { BrandLogo } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Mode = "login" | "register";
type Field = "email" | "password" | "confirm";

interface LoginFormProps {
  defaultMode?: Mode;
  /** Rendered inside a dialog: heading drops to h2 (the page keeps its own h1) and a close button shows. */
  embedded?: boolean;
  onClose?: () => void;
}

const INPUT =
  "w-full min-h-11 bg-stadium-bg border px-3 text-white font-inter text-base sm:text-sm rounded-none " +
  "placeholder:text-stadium-muted/60 transition-colors focus:outline-none focus:border-lfc-red";

export function LoginForm({ defaultMode = "login", embedded = false, onClose }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const safeRedirect = getSafeRedirect(rawRedirect);
  const callbackFailed = searchParams.get("error");
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [values, setValues] = useState({ email: "", password: "", confirm: "" });
  const [googleBusy, setGoogleBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const uid = useId();
  const tLogin = useTranslations("Auth.login");
  const tRegister = useTranslations("Auth.register");
  const tErrors = useTranslations("Auth.errors");
  const t = mode === "login" ? tLogin : tRegister;
  const Heading = embedded ? "h2" : "h1";
  const busy = submitting || googleBusy;
  const effectiveError = error ?? (callbackFailed ? tErrors("unknown") : null);

  function computeErrors(vals: { email: string; password: string; confirm: string }): Partial<Record<Field, string>> {
    const out: Partial<Record<Field, string>> = {};
    if (!vals.email.trim()) out.email = tErrors("emailRequired");
    else if (!/^\S+@\S+\.\S+$/.test(vals.email.trim())) out.email = tErrors("emailInvalid");
    if (!vals.password) out.password = tErrors("passwordRequired");
    else if (mode === "register" && vals.password.length < 6) out.password = tRegister("passwordShort");
    if (mode === "register" && vals.confirm !== vals.password) out.confirm = tRegister("confirmMismatch");
    return out;
  }

  // Inline validation, shown after a field was left (or after a submit attempt).
  const fieldError = computeErrors(values);
  const shown = (f: Field) => (touched[f] ? fieldError[f] : undefined);

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setSuccess(null);
    setTouched({});
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleBusy(true);
    try {
      // Only the Google button needs the Supabase client; load it on click, not with the page.
      const supabase = await loadSupabaseClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Encode so a destination carrying its own `?a=1&b=2` survives the round trip.
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(safeRedirect)}`,
        },
      });
      if (oauthErr) {
        setError(tErrors(toAuthErrorCode(oauthErr)));
        setGoogleBusy(false);
      }
    } catch {
      setError(tErrors("unavailable"));
      setGoogleBusy(false);
    }
  }

  async function ensureUserProfile(supabase: Awaited<ReturnType<typeof loadSupabaseClient>>, userId: string) {
    try {
      await supabase.from("user_profiles").upsert(
        { user_id: userId, username: null, avatar_url: null, bio: null },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    } catch {
      // Non-fatal: profile creation can be retried later without blocking sign-in.
    }
  }

  function finishSignIn(targetPath: string) {
    window.dispatchEvent(new Event("lfc:auth-changed"));
    if (embedded) {
      onClose?.();
      if (rawRedirect) {
        window.location.assign(targetPath);
      } else {
        router.refresh();
      }
      return;
    }
    window.location.assign(targetPath);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Read from the DOM first so password-manager autofill (which may not fire React onChange)
    // is honoured before client validation runs.
    const formData = new FormData(e.currentTarget);
    const domValues = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirm: String(formData.get("confirm") ?? ""),
    };
    setValues(domValues);
    setTouched({ email: true, password: true, confirm: true });

    const domErrors = computeErrors(domValues);
    const relevant: Field[] = mode === "register" ? ["email", "password", "confirm"] : ["email", "password"];
    const firstInvalid = relevant.find((f) => domErrors[f]);
    if (firstInvalid) {
      document.getElementById(`${uid}-${firstInvalid}`)?.focus();
      return;
    }

    const email = domValues.email.trim();
    const password = domValues.password;
    setSubmitting(true);

    try {
      const supabase = await loadSupabaseClient();

      if (mode === "login") {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
        if (authErr) {
          console.warn("[auth] signInWithPassword rejected:", authErr.code, authErr.status, authErr.message);
          setError(tErrors(toAuthErrorCode(authErr)));
          return;
        }
        if (data.user) {
          await ensureUserProfile(supabase, data.user.id);
        }
        finishSignIn(safeRedirect);
        return;
      }

      const registerRedirect = rawRedirect ? safeRedirect : "/profile";
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(registerRedirect)}`,
        },
      });
      if (authErr) {
        console.warn("[auth] signUp rejected:", authErr.code, authErr.status, authErr.message);
        setError(tErrors(toAuthErrorCode(authErr)));
        return;
      }
      // When email confirmation is required, Supabase returns an empty identities array
      // instead of an error for already-registered addresses.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError(tErrors("userExists"));
        return;
      }
      if (data.session && data.user) {
        await ensureUserProfile(supabase, data.user.id);
        finishSignIn(registerRedirect);
        return;
      }
      setSuccess(tRegister("checkEmail"));
    } catch (err) {
      console.error("[auth] submit threw:", err);
      setError(tErrors("unavailable"));
    } finally {
      setSubmitting(false);
    }
  }

  const eyeLabel = showPassword ? tLogin("hidePassword") : tLogin("showPassword");
  const errId = (f: Field) => `${uid}-${f}-err`;
  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [f]: e.target.value }));
  const blur = (f: Field) => () => setTouched((s) => ({ ...s, [f]: true }));
  const inputProps = (f: Field) => ({
    id: `${uid}-${f}`,
    name: f,
    value: values[f],
    onChange: set(f),
    onBlur: blur(f),
    disabled: busy,
    "aria-invalid": shown(f) ? true : undefined,
    "aria-describedby": shown(f) ? errId(f) : undefined,
    className: cn(INPUT, shown(f) ? "border-red-400" : "border-[var(--line-strong)]"),
  });
  const renderError = (f: Field) =>
    shown(f) ? (
      <p id={errId(f)} className="mt-1.5 font-inter text-[13px] text-red-300">
        {shown(f)}
      </p>
    ) : null;
  const labelCls = "font-barlow text-[13px] text-stadium-muted uppercase tracking-[0.12em] block mb-1.5";

  return (
    <div className="w-full max-w-sm">
      <div className="relative surface px-6 py-8 sm:px-8">
        {embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={tLogin("close")}
            className="absolute right-1 top-1 inline-flex size-11 items-center justify-center text-stadium-muted hover:text-white cursor-pointer"
          >
            <X size={18} aria-hidden />
          </button>
        )}
        <div className="mb-7 text-center">
          <BrandLogo className="mb-4 text-white" markClassName="size-8" wordmarkClassName="text-[20px]" />
          <Heading className="font-bebas text-4xl text-white tracking-[0.04em] leading-none">{t("title")}</Heading>
          <p className="font-inter text-stadium-muted text-sm mt-2">{t("subtitle")}</p>
        </div>

        {mode === "register" && success ? (
          <div className="text-center" role="status">
            <p className="text-green-300 font-inter text-sm bg-green-500/10 border border-green-500/20 px-4 py-3 mb-6">
              {success}
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setSuccess(null);
              }}
              className="min-h-11 font-inter text-brand hover:underline text-sm font-medium cursor-pointer"
            >
              ← {tRegister("login")}
            </button>
          </div>
        ) : (
          <>
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={busy}
                  className="w-full min-h-11 flex items-center justify-center gap-3 px-4 border border-[var(--line-strong)] text-white font-barlow font-semibold uppercase tracking-[0.12em] text-sm hover:bg-stadium-surface2 transition-colors mb-5 cursor-pointer disabled:opacity-60"
                >
                  {googleBusy ? (
                    <Loader2 className="size-[18px] animate-spin" aria-hidden />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  {tLogin("google")}
                </button>

                <div className="flex items-center gap-3 mb-5" aria-hidden>
                  <div className="flex-1 h-px bg-[var(--line)]" />
                  <span className="font-inter text-xs text-stadium-muted">{tLogin("or")}</span>
                  <div className="flex-1 h-px bg-[var(--line)]" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <label htmlFor={`${uid}-email`} className={labelCls}>
                  {t("email")}
                </label>
                <input
                  {...inputProps("email")}
                  type="email"
                  inputMode="email"
                  autoComplete={mode === "login" ? "username" : "email"}
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                />
                {renderError("email")}
              </div>

              <div>
                <label htmlFor={`${uid}-password`} className={labelCls}>
                  {t("password")}
                </label>
                <div className="relative">
                  <input
                    {...inputProps("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className={cn(inputProps("password").className, "pr-12")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 inline-flex size-11 items-center justify-center text-stadium-muted hover:text-white transition-colors cursor-pointer"
                    aria-label={eyeLabel}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </div>
                {mode === "register" && !shown("password") && (
                  <p className="mt-1.5 font-inter text-[13px] text-stadium-muted">{tRegister("passwordHint")}</p>
                )}
                {renderError("password")}
              </div>

              {mode === "register" && (
                <div>
                  <label htmlFor={`${uid}-confirm`} className={labelCls}>
                    {tRegister("confirm")}
                  </label>
                  <input
                    {...inputProps("confirm")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                  />
                  {renderError("confirm")}
                </div>
              )}

              {/* Reserved live region: announces server errors without moving the layout when empty. */}
              <div aria-live="polite" role="status">
                {effectiveError && (
                  <p className="text-red-300 font-inter text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                    {effectiveError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full min-h-11 bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm -mt-2"
              >
                {submitting && <Loader2 className="animate-spin" aria-hidden />}
                {submitting ? t("loading") : t("button")}
              </Button>
            </form>

            <p className="text-center font-inter text-sm text-stadium-muted mt-5">
              {mode === "login" ? tLogin("noAccount") : tRegister("hasAccount")}{" "}
              <button
                type="button"
                onClick={switchMode}
                className="min-h-11 px-1 text-brand hover:underline font-medium cursor-pointer"
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
