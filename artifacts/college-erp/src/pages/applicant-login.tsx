import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, GraduationCap, Eye, EyeOff } from "lucide-react";

const STORAGE_KEY = "applicant_token";
const REMEMBER_KEY = "applicant_remember";

export function getApplicantToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
}

export function clearApplicantSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export default function ApplicantLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Session restore – if a token already exists, skip straight to dashboard
  useEffect(() => {
    const token = getApplicantToken();
    if (token) setLocation("/admissions/dashboard");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/applicants/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Login failed"); return; }
      // Remember Me → persist in localStorage; otherwise sessionStorage only
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, data.token);
        localStorage.setItem(REMEMBER_KEY, "1");
      } else {
        sessionStorage.setItem(STORAGE_KEY, data.token);
        localStorage.removeItem(STORAGE_KEY);
      }
      setLocation("/admissions/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-16">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nexus College</p>
          <p className="font-bold">Applicant Portal</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Sign in to your account</CardTitle>
          <CardDescription>Enter your credentials to access your application.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="pr-10" />
                <button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="accent-primary" />
                Remember me
              </label>
              <Link href="/admissions/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/admissions/register" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/admissions" className="hover:underline">← Back to Admissions Portal</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
