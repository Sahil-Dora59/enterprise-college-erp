import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ApplicantRegister() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ email: "", phone: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordStrength = (p: string) => {
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    return score;
  };
  const strength = passwordStrength(form.password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (strength < 4) { setError("Password must be at least 8 characters with uppercase, lowercase, and a number."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/applicants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), phone: form.phone.trim(), password: form.password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Registration failed"); return; }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-16">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="flex justify-center"><CheckCircle2 className="h-16 w-16 text-emerald-500" /></div>
            <h2 className="text-xl font-bold">Account created!</h2>
            <p className="text-muted-foreground text-sm">Your applicant account has been created. Please check your email to verify your address, then sign in.</p>
            <Button className="w-full" onClick={() => setLocation("/admissions/login")}>Go to sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Register to start your application.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email address</Label>
              <Input id="reg-email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone">Mobile number</Label>
              <Input id="reg-phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Password</Label>
              <div className="relative">
                <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="pr-10" autoComplete="new-password" />
                <button type="button" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">{[1,2,3,4].map((i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : "bg-muted"}`} />)}</div>
                  <p className={`text-xs ${["","text-red-500","text-orange-500","text-yellow-600","text-emerald-600"][strength]}`}>{strengthLabel}</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-confirm">Confirm password</Label>
              <Input id="reg-confirm" type={showPassword ? "text" : "password"} placeholder="Repeat your password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required autoComplete="new-password" />
            </div>

            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/admissions/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
