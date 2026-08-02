import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApplicantLogin() {
  const [, setLocation] = useLocation(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch("/api/applicants/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const data = await r.json(); if (!r.ok) { setError(data.error); return; } localStorage.setItem("applicant_token", data.token); setLocation("/admissions/dashboard"); };
  return <div className="mx-auto max-w-md px-6 py-16"><Card><CardHeader><CardTitle>Applicant login</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /><Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />{error && <p className="text-sm text-destructive">{error}</p>}<label className="flex gap-2 text-sm"><input type="checkbox" /> Remember me</label><Button className="w-full">Sign in</Button><div className="flex justify-between text-sm"><Link href="/admissions/register">Create account</Link><Link href="/admissions/forgot-password">Forgot password?</Link></div></form></CardContent></Card></div>;
}