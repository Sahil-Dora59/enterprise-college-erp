import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ApplicantResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const strong = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) { setError("Reset token is missing. Use the link from your email."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (!strong(password)) { setError("Password must be at least 8 characters with uppercase, lowercase, and a number."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/applicants/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Reset failed"); return; }
      setDone(true);
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
          <CardTitle className="text-xl">Create a new password</CardTitle>
          <CardDescription>Enter a strong password to complete your reset.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="font-semibold">Password reset successfully</p>
              <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
              <Button className="w-full" onClick={() => setLocation("/admissions/login")}>Go to sign in</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rp-password">New password</Label>
                <div className="relative">
                  <Input id="rp-password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-confirm">Confirm password</Label>
                <Input id="rp-confirm" type={showPassword ? "text" : "password"} placeholder="Repeat your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              {!token && <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">No reset token found. Use the link from your reset email.</p>}
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting…</> : "Reset password"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/admissions/login" className="hover:underline">← Back to sign in</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
