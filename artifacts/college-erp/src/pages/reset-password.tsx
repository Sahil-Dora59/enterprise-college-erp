import { useState } from "react";
import { useLocation } from "wouter";
import { LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({ title: "Password reset", description: result.message });
      setLocation("/login");
    } catch (error) { toast({ title: "Unable to reset password", description: error instanceof Error ? error.message : "Please request a new reset link.", variant: "destructive" }); }
    finally { setSaving(false); }
  };
  return <div className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Reset your password</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div><Label htmlFor="reset-password">New password</Label><div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="reset-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" placeholder="8+ characters, upper/lowercase and number" /></div></div><Button className="w-full" disabled={saving || !token}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? "Resetting..." : "Reset password"}</Button></form></CardContent></Card></div>;
}