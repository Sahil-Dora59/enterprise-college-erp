import { useEffect, useState } from "react";
import { Search, CheckCircle2, XCircle, Clock, FileCheck, Download, Sparkles, CalendarPlus, FlaskConical, GraduationCap, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TABS = ["queue", "interviews", "tests", "academic", "delivery"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { queue: "Application Queue", interviews: "Interviews", tests: "Entrance Tests", academic: "Academic Queue", delivery: "Delivery Queue" };

const STATUS_COLOR: Record<string, string> = { draft: "secondary", submitted: "default", verification: "default", review: "default", approved: "default", rejected: "destructive", waitlisted: "secondary", correction_requested: "secondary" };

function formatDate(d: string | null | undefined) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"; }

export default function AdmissionCrm() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("queue");
  const [rows, setRows] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [academic, setAcademic] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [aiPanelId, setAiPanelId] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [appDocs, setAppDocs] = useState<any[]>([]);
  const [scheduleModal, setScheduleModal] = useState<{ type: "interview" | "test"; applicationId: number } | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: "", mode: "online", testCenter: "", seatNumber: "", notes: "" });

  const hdr = { Authorization: `Bearer ${token}` };

  const loadQueue = async (q = "") => {
    const r = await fetch(`/api/admissions/applications?search=${encodeURIComponent(q)}`, { headers: hdr });
    if (r.ok) setRows(await r.json());
  };
  const loadInterviews = async () => {
    // Load all interviews across all apps
    const r = await fetch("/api/admissions/applications", { headers: hdr });
    if (!r.ok) return;
    const apps: any[] = await r.json();
    const all: any[] = [];
    await Promise.all(apps.slice(0, 50).map(async (app) => {
      const ir = await fetch(`/api/admissions/applications/${app.id}/interviews`, { headers: hdr });
      if (ir.ok) { const ivs = await ir.json(); ivs.forEach((iv: any) => all.push({ ...iv, appName: app.applicantName, applicationId: app.applicationId })); }
    }));
    setInterviews(all.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()));
  };
  const loadTests = async () => {
    const r = await fetch("/api/admissions/applications", { headers: hdr });
    if (!r.ok) return;
    const apps: any[] = await r.json();
    const all: any[] = [];
    await Promise.all(apps.slice(0, 50).map(async (app) => {
      const tr = await fetch(`/api/admissions/applications/${app.id}/tests`, { headers: hdr });
      if (tr.ok) { const ts = await tr.json(); ts.forEach((t: any) => all.push({ ...t, appName: app.applicantName, applicationId: app.applicationId })); }
    }));
    setTests(all.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()));
  };
  const loadAcademic = async () => {
    const r = await fetch("/api/admissions/academic-assignments", { headers: hdr });
    if (r.ok) setAcademic(await r.json());
  };
  const loadDelivery = async () => {
    const r = await fetch("/api/admissions/delivery-queue", { headers: hdr });
    if (r.ok) setDelivery(await r.json());
  };

  useEffect(() => { if (!token) return; void loadQueue(); }, [token]);
  useEffect(() => {
    if (!token) return;
    if (tab === "interviews") void loadInterviews();
    if (tab === "tests") void loadTests();
    if (tab === "academic") void loadAcademic();
    if (tab === "delivery") void loadDelivery();
  }, [tab, token]);

  const review = async (id: number, status: string, comment = "") => {
    const r = await fetch(`/api/admissions/applications/${id}/review`, { method: "PATCH", headers: { "Content-Type": "application/json", ...hdr }, body: JSON.stringify({ status, comment }) });
    if (r.ok) { toast({ title: `Application ${status}` }); void loadQueue(search); }
    else { const d = await r.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); }
  };

  const verifyDoc = async (docId: number, status: "verified" | "rejected", comment = "") => {
    const r = await fetch(`/api/admissions/documents/${docId}/verify`, { method: "PATCH", headers: { "Content-Type": "application/json", ...hdr }, body: JSON.stringify({ status, comment }) });
    if (r.ok) { toast({ title: `Document ${status}` }); if (expandedId) { const dr = await fetch(`/api/admissions/applications/${rows.find(rr => rr.id === expandedId)?.applicationId}/dashboard`); if (dr.ok) { const d = await dr.json(); setAppDocs(d.documents ?? []); } } }
  };

  const loadAppDocs = async (applicationId: string) => {
    const r = await fetch(`/api/admissions/applications/${applicationId}/dashboard`);
    if (r.ok) { const d = await r.json(); setAppDocs(d.documents ?? []); }
  };

  const runAI = async (applicationId: string) => {
    setAiLoading(true); setAiAnalysis(null);
    const r = await fetch(`/api/admissions/applications/${applicationId}/ai-analysis`, { headers: hdr });
    if (r.ok) setAiAnalysis(await r.json());
    else { const d = await r.json(); toast({ title: "AI analysis failed", description: d.error, variant: "destructive" }); }
    setAiLoading(false);
  };

  const scheduleItem = async () => {
    if (!scheduleModal) return;
    const { type, applicationId } = scheduleModal;
    const url = `/api/admissions/applications/${applicationId}/${type}`;
    const body = type === "interview"
      ? { scheduledAt: scheduleForm.scheduledAt, mode: scheduleForm.mode, notes: scheduleForm.notes }
      : { scheduledAt: scheduleForm.scheduledAt, testCenter: scheduleForm.testCenter, seatNumber: scheduleForm.seatNumber };
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...hdr }, body: JSON.stringify(body) });
    if (r.ok) {
      toast({ title: `${type === "interview" ? "Interview" : "Test"} scheduled` });
      setScheduleModal(null);
      setScheduleForm({ scheduledAt: "", mode: "online", testCenter: "", seatNumber: "", notes: "" });
      void loadQueue(search);
      if (type === "interview") void loadInterviews();
      else void loadTests();
    } else { const d = await r.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Admissions operations</p>
        <h1 className="text-3xl font-bold">Admission CRM</h1>
        <p className="text-muted-foreground">Review, verify, and manage applicant submissions.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border bg-muted p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{TAB_LABEL[t]}</button>
        ))}
      </div>

      {/* ── Application Queue ── */}
      {tab === "queue" && <>
        <div className="flex gap-2">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, ID, email, reference…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadQueue(search)} />
          </div>
          <Button variant="outline" onClick={() => loadQueue(search)}>Search</Button>
          <Button variant="outline" asChild><a href="/api/admissions/export.xlsx" download>Export Excel</a></Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Application queue ({rows.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {rows.length === 0 && <p className="py-10 text-center text-muted-foreground">No applications found.</p>}
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border">
                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{row.applicantName}</p>
                    <p className="text-sm text-muted-foreground">{row.applicationId} · {row.referenceNumber}</p>
                    <p className="text-sm text-muted-foreground">{row.email} · {row.program}</p>
                    <p className="text-xs text-muted-foreground">Submitted: {formatDate(row.submittedAt)}</p>
                  </div>
                  <Badge variant={STATUS_COLOR[row.status] as any ?? "outline"} className="w-fit capitalize">{row.status.replace(/_/g, " ")}</Badge>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setExpandedId(expandedId === row.id ? null : row.id); loadAppDocs(row.applicationId); }}>
                      <FileCheck className="mr-1 h-3.5 w-3.5" />{expandedId === row.id ? "Hide docs" : "Docs"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setAiPanelId(aiPanelId === row.id ? null : row.id); if (aiPanelId !== row.id) runAI(row.applicationId); }}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" />AI
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setScheduleModal({ type: "interview", applicationId: row.id })}>
                      <CalendarPlus className="mr-1 h-3.5 w-3.5" />Interview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setScheduleModal({ type: "test", applicationId: row.id })}>
                      <FlaskConical className="mr-1 h-3.5 w-3.5" />Test
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/admissions/applications/${row.applicationId}/letter`} target="_blank" rel="noopener noreferrer"><Download className="mr-1 h-3.5 w-3.5" />Letter</a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/admissions/applications/${row.applicationId}/export.csv`} download><Download className="mr-1 h-3.5 w-3.5" />CSV</a>
                    </Button>
                    <Button size="sm" onClick={() => review(row.id, "approved")}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => review(row.id, "verification")}><Clock className="mr-1 h-3.5 w-3.5" />Verify</Button>
                    <Button size="sm" variant="destructive" onClick={() => review(row.id, "rejected")}><XCircle className="mr-1 h-3.5 w-3.5" />Reject</Button>
                    <Button size="sm" variant="outline" onClick={() => review(row.id, "waitlisted")}>Waitlist</Button>
                  </div>
                </div>

                {/* Document panel */}
                {expandedId === row.id && (
                  <div className="border-t bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Documents</p>
                    {appDocs.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {appDocs.map((doc: any) => (
                          <div key={doc.id} className="rounded-lg border bg-background p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-medium capitalize">{doc.documentType.replace(/_/g, " ")}</p>
                                <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                              </div>
                              <Badge variant="outline" className={`text-xs capitalize ${doc.verificationStatus === "verified" ? "border-emerald-500 text-emerald-600" : doc.verificationStatus === "rejected" ? "border-red-400 text-red-600" : ""}`}>{doc.verificationStatus}</Badge>
                            </div>
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => verifyDoc(doc.id, "verified")}><CheckCircle2 className="h-3 w-3 mr-1" />Verify</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive" onClick={() => verifyDoc(doc.id, "rejected")}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* AI panel */}
                {aiPanelId === row.id && (
                  <div className="border-t bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI Analysis</p>
                    {aiLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />Generating analysis…</div> : aiAnalysis ? (
                      <div className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-3 text-center">
                          <div className="rounded-lg border bg-background p-2"><p className="text-lg font-bold">{aiAnalysis.documentsUploaded}</p><p className="text-xs text-muted-foreground">Docs uploaded</p></div>
                          <div className="rounded-lg border bg-background p-2"><p className="text-lg font-bold">{aiAnalysis.verifiedDocuments}</p><p className="text-xs text-muted-foreground">Verified</p></div>
                          <div className="rounded-lg border bg-background p-2"><p className="text-lg font-bold">{aiAnalysis.missingDocuments.length}</p><p className="text-xs text-muted-foreground">Missing</p></div>
                        </div>
                        <div className="rounded-lg border bg-background p-3 text-sm whitespace-pre-line">{aiAnalysis.analysis}</div>
                        {aiAnalysis.missingDocuments.length > 0 && <div className="flex flex-wrap gap-1">{aiAnalysis.missingDocuments.map((d: string) => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}</div>}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No analysis available.</p>}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </>}

      {/* ── Interviews ── */}
      {tab === "interviews" && (
        <Card>
          <CardHeader><CardTitle>Interview schedule ({interviews.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {interviews.length === 0 && <p className="py-8 text-center text-muted-foreground">No interviews scheduled.</p>}
            {interviews.map((iv) => (
              <div key={iv.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-semibold">{iv.appName}</p>
                  <p className="text-sm text-muted-foreground">{iv.applicationId} · {new Date(iv.scheduledAt).toLocaleString("en-IN")}</p>
                  <p className="text-sm text-muted-foreground capitalize">Mode: {iv.mode} · Status: {iv.status}</p>
                  {iv.notes && <p className="text-xs text-muted-foreground mt-0.5">{iv.notes}</p>}
                  {iv.feedback && <p className="text-xs mt-0.5">Feedback: {iv.feedback}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {iv.result && <Badge variant="outline" className="capitalize">{iv.result}</Badge>}
                  <Button size="sm" variant="outline" onClick={async () => {
                    const result = prompt("Enter result (pass/fail/pending):"); if (!result) return;
                    const feedback = prompt("Enter feedback/notes (optional):") ?? "";
                    const r = await fetch(`/api/admissions/interviews/${iv.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...hdr }, body: JSON.stringify({ status: "completed", result, feedback }) });
                    if (r.ok) { toast({ title: "Interview updated" }); void loadInterviews(); }
                  }}>Update result</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Entrance tests ── */}
      {tab === "tests" && (
        <Card>
          <CardHeader><CardTitle>Entrance tests ({tests.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tests.length === 0 && <p className="py-8 text-center text-muted-foreground">No entrance tests scheduled.</p>}
            {tests.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-semibold">{t.appName}</p>
                  <p className="text-sm text-muted-foreground">{t.applicationId} · {new Date(t.scheduledAt).toLocaleString("en-IN")}</p>
                  <p className="text-sm text-muted-foreground">Center: {t.testCenter ?? "TBA"} · Seat: {t.seatNumber ?? "TBA"}</p>
                  {t.score != null && <p className="text-sm">Score: <strong>{t.score}</strong> · {t.result}</p>}
                  {t.eligibilityDecision && <Badge variant="outline" className="capitalize mt-1">{t.eligibilityDecision}</Badge>}
                </div>
                <Button size="sm" variant="outline" onClick={async () => {
                  const score = prompt("Enter score:"); if (!score) return;
                  const result = prompt("Enter result (pass/fail):") ?? "pending";
                  const decision = prompt("Eligibility decision (eligible/ineligible/borderline):") ?? "";
                  const r = await fetch(`/api/admissions/tests/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...hdr }, body: JSON.stringify({ score: Number(score), result, eligibilityDecision: decision }) });
                  if (r.ok) { toast({ title: "Test result updated" }); void loadTests(); }
                }}>Enter result</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Academic assignments ── */}
      {tab === "academic" && (
        <Card>
          <CardHeader><CardTitle>Pending academic assignments ({academic.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {academic.length === 0 && <p className="py-8 text-center text-muted-foreground text-sm">No pending academic assignments. All approved students have been mapped.</p>}
            {academic.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-semibold text-sm">Assignment #{a.id} · Application #{a.applicationId}</p>
                  <p className="text-xs text-muted-foreground">{a.notes}</p>
                  <p className="text-xs text-muted-foreground">Created: {formatDate(a.createdAt)}</p>
                </div>
                <Badge variant="outline" className="w-fit capitalize">{a.status}</Badge>
                <Button size="sm" variant="outline" onClick={async () => {
                  const deptId = prompt("Enter Department ID:"); if (!deptId) return;
                  const semId = prompt("Enter Semester ID:"); if (!semId) return;
                  const session = prompt("Academic session (e.g. 2026-27):") ?? "";
                  const r = await fetch(`/api/admissions/academic-assignments/${a.id}/complete`, { method: "PATCH", headers: { "Content-Type": "application/json", ...hdr }, body: JSON.stringify({ departmentId: Number(deptId), semesterId: Number(semId), academicSession: session }) });
                  if (r.ok) { toast({ title: "Academic assignment completed" }); void loadAcademic(); }
                  else { const d = await r.json(); toast({ title: "Error", description: d.error, variant: "destructive" }); }
                }}>Complete assignment</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Delivery queue ── */}
      {tab === "delivery" && (
        <Card>
          <CardHeader><CardTitle>Delivery queue ({delivery.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {delivery.length === 0 && <p className="py-8 text-center text-muted-foreground">Delivery queue is empty.</p>}
            {delivery.slice(0, 50).map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.recipient}</p>
                  <p className="text-xs text-muted-foreground capitalize">{d.channel} · {d.template}</p>
                  {d.lastError && <p className="text-xs text-destructive truncate">{d.lastError}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Attempts: {d.attempts}</span>
                  <Badge variant="outline" className={`text-xs capitalize ${d.status === "delivered" ? "border-emerald-500 text-emerald-600" : d.status === "failed" ? "border-red-400 text-red-600" : d.status === "processing" ? "border-blue-400 text-blue-600" : ""}`}>{d.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Schedule modal ── */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setScheduleModal(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle>Schedule {scheduleModal.type === "interview" ? "Interview" : "Entrance Test"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date & time</label>
                <Input type="datetime-local" value={scheduleForm.scheduledAt} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })} />
              </div>
              {scheduleModal.type === "interview" ? <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Mode</label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={scheduleForm.mode} onChange={(e) => setScheduleForm({ ...scheduleForm, mode: e.target.value })}>
                    <option value="online">Online</option>
                    <option value="offline">Offline / In-person</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Input value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} placeholder="Location, link, instructions…" />
                </div>
              </> : <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Test center</label>
                  <Input value={scheduleForm.testCenter} onChange={(e) => setScheduleForm({ ...scheduleForm, testCenter: e.target.value })} placeholder="e.g. Main Campus – Hall A" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Seat number</label>
                  <Input value={scheduleForm.seatNumber} onChange={(e) => setScheduleForm({ ...scheduleForm, seatNumber: e.target.value })} placeholder="e.g. A-042" />
                </div>
              </>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setScheduleModal(null)}>Cancel</Button>
                <Button onClick={scheduleItem} disabled={!scheduleForm.scheduledAt}><Send className="mr-2 h-4 w-4" />Schedule</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
