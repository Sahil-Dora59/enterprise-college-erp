import { useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdmissionApply() {
  const [form, setForm] = useState({ applicantName: "", email: "", phone: "", guardianName: "", guardianPhone: "", address: "", qualification: "", program: "B.Tech Computer Science", declarationAccepted: false });
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (submit: boolean) => {
    const response = await fetch("/api/admissions/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, submit }) });
    const data = await response.json();
    if (!response.ok) { toast({ title: "Application needs attention", description: data.error, variant: "destructive" }); return; }
    setResult(data); toast({ title: submit ? "Application submitted" : "Draft saved", description: data.applicationId });
  };
  if (result) return <div className="mx-auto max-w-2xl px-6 py-16"><Card><CardContent className="space-y-5 p-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /><h1 className="text-2xl font-bold">{result.status === "submitted" ? "Application submitted" : "Draft saved"}</h1><p className="text-muted-foreground">Keep these details safe to track your application.</p><div className="rounded-lg bg-muted p-4 text-left text-sm"><p><b>Application ID:</b> {result.applicationId}</p><p><b>Reference number:</b> {result.referenceNumber}</p><p><b>Status:</b> {result.status}</p></div><Link href={`/admissions/track/${result.applicationId}`}><Button>Track application</Button></Link></CardContent></Card></div>;
  return <div className="mx-auto max-w-4xl space-y-6 px-6 py-10"><Link href="/admissions" className="inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="mr-2 h-4 w-4" />Back to admissions</Link><div><p className="text-sm font-semibold uppercase tracking-widest text-primary">Online application</p><h1 className="mt-2 text-3xl font-bold">Tell us about yourself</h1><p className="mt-1 text-muted-foreground">Save a draft at any time. All fields can be completed before final submission.</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Personal and academic information</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
    {([["applicantName","Applicant name"],["email","Email"],["phone","Mobile number"],["guardianName","Parent / guardian name"],["guardianPhone","Guardian phone"],["qualification","Educational qualification"],["address","Address"]]).map(([key,label]) => <div className={key === "address" ? "md:col-span-2" : ""} key={key}><Label htmlFor={key}>{label}</Label><Input id={key} value={String(form[key as keyof typeof form])} onChange={(e) => update(key, e.target.value)} className="mt-1" /></div>)}<div><Label htmlFor="program">Course selection</Label><select id="program" value={form.program} onChange={(e) => update("program", e.target.value)} className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm"><option>B.Tech Computer Science</option><option>BBA Business Administration</option><option>B.Com Commerce</option></select></div><label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.declarationAccepted} onChange={(e) => update("declarationAccepted", e.target.checked)} /> I declare that the information provided is accurate.</label><div className="flex flex-wrap gap-3 md:col-span-2"><Button type="button" variant="outline" onClick={() => submit(false)}>Save draft</Button><Button type="button" onClick={() => submit(true)} disabled={!form.declarationAccepted}>Submit application</Button></div>
  </CardContent></Card></div>;
}