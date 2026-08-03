import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle, User, BookOpen, Home, Users, FileText } from "lucide-react";
import { getApplicantToken } from "./applicant-login";
import { useToast } from "@/hooks/use-toast";

interface AppData {
  applicantName: string;
  email: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  qualification: string;
  program: string;
  declarationAccepted: boolean;
}

const EMPTY: AppData = { applicantName: "", email: "", phone: "", guardianName: "", guardianPhone: "", address: "", qualification: "", program: "", declarationAccepted: false };

const SECTIONS = [
  { id: "personal", label: "Personal Details", icon: User, fields: ["applicantName", "email", "phone"] },
  { id: "guardian", label: "Parent / Guardian", icon: Users, fields: ["guardianName", "guardianPhone"] },
  { id: "academic", label: "Education", icon: BookOpen, fields: ["qualification", "program"] },
  { id: "address", label: "Address", icon: Home, fields: ["address"] },
  { id: "declaration", label: "Declaration", icon: FileText, fields: ["declarationAccepted"] },
];

function calcCompletion(data: AppData): number {
  const fields: (keyof AppData)[] = ["applicantName", "email", "phone", "guardianName", "guardianPhone", "address", "qualification", "program", "declarationAccepted"];
  const filled = fields.filter((f) => Boolean(data[f])).length;
  return Math.round((filled / fields.length) * 100);
}

export default function ApplicantProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [applicationId, setApplicationId] = useState("");
  const [form, setForm] = useState<AppData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");

  useEffect(() => {
    const token = getApplicantToken();
    if (!token) { setLocation("/admissions/login"); return; }
    // Load saved application ID from session
    const savedId = sessionStorage.getItem("applicant_app_id") ?? localStorage.getItem("applicant_app_id");
    if (!savedId) { setLoading(false); return; }
    setApplicationId(savedId);
    fetch(`/api/admissions/applications/${encodeURIComponent(savedId)}/dashboard`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.application) {
          const a = data.application;
          setForm({ applicantName: a.applicantName ?? "", email: a.email ?? "", phone: a.phone ?? "", guardianName: a.guardianName ?? "", guardianPhone: a.guardianPhone ?? "", address: a.address ?? "", qualification: a.qualification ?? "", program: a.program ?? "", declarationAccepted: Boolean(a.declarationAccepted) });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const token = getApplicantToken();
    if (!applicationId || !token) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admissions/applications/${encodeURIComponent(applicationId)}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (r.ok) { toast({ title: "Profile saved" }); }
      else { const d = await r.json(); toast({ title: "Save failed", description: d.error, variant: "destructive" }); }
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof AppData, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const completion = calcCompletion(form);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!applicationId) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">No application found</h2>
        <p className="text-muted-foreground text-sm">You need to start an application before editing your profile.</p>
        <Button onClick={() => setLocation("/admissions/apply")}>Start application</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Applicant Portal</p>
        <h1 className="text-2xl font-bold">Profile Completion</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete all sections to proceed with your admission.</p>
      </div>

      {/* Completion bar */}
      <Card>
        <CardContent className="pt-5 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Profile completion</span>
            <span className={`text-sm font-bold ${completion === 100 ? "text-emerald-600" : completion >= 60 ? "text-yellow-600" : "text-destructive"}`}>{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
          {completion < 100 && <p className="text-xs text-muted-foreground">Complete all required fields before submitting your application.</p>}
          {completion === 100 && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Profile complete — ready to submit</p>}
        </CardContent>
      </Card>

      {/* Section checklist + form */}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-1">
          {SECTIONS.map((s) => {
            const filled = s.fields.filter((f) => Boolean(form[f as keyof AppData])).length;
            const allFilled = filled === s.fields.length;
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{s.label}</span>
                {allFilled ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Badge variant="outline" className="text-xs shrink-0">{filled}/{s.fields.length}</Badge>}
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{SECTIONS.find((s) => s.id === activeSection)?.label}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {activeSection === "personal" && <>
              <div className="space-y-1.5"><Label>Full name *</Label><Input value={form.applicantName} onChange={(e) => set("applicantName", e.target.value)} placeholder="As on official documents" /></div>
              <div className="space-y-1.5"><Label>Email address *</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" /></div>
              <div className="space-y-1.5"><Label>Mobile number *</Label><Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" /></div>
            </>}
            {activeSection === "guardian" && <>
              <div className="space-y-1.5"><Label>Parent / Guardian name</Label><Input value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} placeholder="Father / Mother / Guardian" /></div>
              <div className="space-y-1.5"><Label>Guardian mobile</Label><Input type="tel" value={form.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} placeholder="+91 98765 43210" /></div>
            </>}
            {activeSection === "academic" && <>
              <div className="space-y-1.5"><Label>Highest qualification</Label><Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g. 12th – Science (PCM), 90%" /></div>
              <div className="space-y-1.5"><Label>Applying for programme *</Label><Input value={form.program} onChange={(e) => set("program", e.target.value)} placeholder="B.Tech Computer Science" /></div>
            </>}
            {activeSection === "address" && <>
              <div className="space-y-1.5"><Label>Residential address</Label><textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-ring" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House / Flat No, Street, City, State, PIN" /></div>
            </>}
            {activeSection === "declaration" && <>
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
                <p>I hereby declare that all information provided in this application is true and correct to the best of my knowledge. I understand that any false information may result in rejection of my application or cancellation of admission.</p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm select-none">
                <input type="checkbox" checked={form.declarationAccepted} onChange={(e) => set("declarationAccepted", e.target.checked)} className="h-4 w-4 accent-primary" />
                <span>I accept the above declaration</span>
              </label>
            </>}

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => {
                const idx = SECTIONS.findIndex((s) => s.id === activeSection);
                if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
              }} disabled={activeSection === SECTIONS[0].id}>Previous</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
                <Button size="sm" onClick={() => {
                  const idx = SECTIONS.findIndex((s) => s.id === activeSection);
                  if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
                }} disabled={activeSection === SECTIONS[SECTIONS.length - 1].id}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setLocation("/admissions/dashboard")}>Back to dashboard</Button>
        <Button onClick={save} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save all changes"}</Button>
      </div>
    </div>
  );
}
