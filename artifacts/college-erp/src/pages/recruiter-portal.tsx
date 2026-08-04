import { useState } from "react";
import { useLocation } from "wouter";
import { BriefcaseBusiness, Building2, LockKeyhole, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RecruiterPortal() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const submit = async () => {
    const path = mode === "login" ? "/api/placements/recruiters/login" : "/api/placements/recruiters/register";
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to continue");
    if (body.token) { localStorage.setItem("erp_token", body.token); setLocation("/placements"); }
    else setMode("login");
  };
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><div className="mb-3 flex items-center gap-2 text-primary"><BriefcaseBusiness className="h-5 w-5" /> Career ecosystem</div><CardTitle>{mode === "login" ? "Recruiter Login" : "Register your company"}</CardTitle></CardHeader><CardContent className="space-y-3">{mode === "register" && <><Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input placeholder="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></>}<Input placeholder="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><Button className="w-full" onClick={submit}>{mode === "login" ? <><LockKeyhole className="mr-2 h-4 w-4" />Sign in</> : <><Building2 className="mr-2 h-4 w-4" />Create recruiter account</>}</Button><Button variant="ghost" className="w-full" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Register a company" : "Already have an account? Sign in"}</Button><Button variant="link" className="w-full" onClick={() => setLocation("/admissions")}><UserRound className="mr-2 h-4 w-4" />Back to college portal</Button></CardContent></Card></div>;
}