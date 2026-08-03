/**
 * Applicant Dashboard — full experience
 * Upload component: XHR-based progress with drag & drop, preview, replace, retry, cancel, history
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X, Eye, RotateCcw, CheckCircle2, AlertCircle, Clock, FileText, Image as ImageIcon, Download, Trash2, User, Bell } from "lucide-react";
import { getApplicantToken, clearApplicantSession } from "./applicant-login";
import { useToast } from "@/hooks/use-toast";

const REQUIRED_DOCS = ["passport_photo", "signature", "10th_certificate", "12th_certificate", "identity_proof"];
const ALL_DOCS = ["passport_photo", "signature", "10th_certificate", "12th_certificate", "transfer_certificate", "migration_certificate", "identity_proof", "category_certificate", "income_certificate", "other"];
const DOC_LABEL: Record<string, string> = { passport_photo: "Passport Photo", signature: "Signature", "10th_certificate": "10th Certificate", "12th_certificate": "12th Certificate", transfer_certificate: "Transfer Certificate", migration_certificate: "Migration Certificate", identity_proof: "Identity Proof", category_certificate: "Category Certificate", income_certificate: "Income Certificate", other: "Other Document" };

const STATUS_COLOR: Record<string, string> = { draft: "bg-muted text-muted-foreground", submitted: "bg-blue-100 text-blue-700", verification: "bg-purple-100 text-purple-700", review: "bg-yellow-100 text-yellow-800", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700", waitlisted: "bg-orange-100 text-orange-700", correction_requested: "bg-amber-100 text-amber-800" };
const DOC_STATUS_COLOR: Record<string, string> = { pending: "text-yellow-600", verified: "text-emerald-600", rejected: "text-red-600" };

interface UploadItem {
  id: string;
  documentType: string;
  file: File;
  preview: string | null;
  progress: number;
  status: "queued" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
  abortController?: AbortController;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uploadWithProgress(url: string, body: object, onProgress: (pct: number) => void, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    signal.addEventListener("abort", () => { xhr.abort(); reject(new DOMException("Aborted", "AbortError")); });
    xhr.upload.addEventListener("progress", (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); });
    xhr.addEventListener("load", () => resolve(new Response(xhr.responseText, { status: xhr.status })));
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(body));
  });
}

export default function AdmissionTrack() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [appId, setAppId] = useState(params.id ?? "");
  const [searchInput, setSearchInput] = useState(appId);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(!!params.id);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [selectedDocType, setSelectedDocType] = useState(ALL_DOCS[0]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = getApplicantToken();

  const load = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/admissions/applications/${encodeURIComponent(id.trim())}/dashboard`);
      const d = await r.json();
      if (r.ok) {
        setData(d);
        // Persist for profile page
        sessionStorage.setItem("applicant_app_id", id.trim());
        localStorage.setItem("applicant_app_id", id.trim());
      } else { setData({ error: d.error ?? "Application not found" }); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (params.id) { setAppId(params.id); setSearchInput(params.id); load(params.id); }
    else {
      // Try restoring from session
      const saved = sessionStorage.getItem("applicant_app_id") ?? localStorage.getItem("applicant_app_id");
      if (saved) { setAppId(saved); setSearchInput(saved); load(saved); }
    }
  }, [params.id, load]);

  // ── File handling ───────────────────────────────────────────────────────
  const enqueue = (files: FileList | File[]) => {
    const items: UploadItem[] = Array.from(files).map((file) => {
      const isImage = file.type.startsWith("image/");
      const preview = isImage ? URL.createObjectURL(file) : null;
      return { id: crypto.randomUUID(), documentType: selectedDocType, file, preview, progress: 0, status: "queued" };
    });
    setUploadQueue((q) => [...q, ...items]);
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) { enqueue(e.target.files); e.target.value = ""; } };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) enqueue(e.dataTransfer.files); };

  const startUpload = async (item: UploadItem) => {
    if (!appId) { toast({ title: "No application ID", variant: "destructive" }); return; }
    const ac = new AbortController();
    setUploadQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "uploading", abortController: ac } : i));
    try {
      const fileData = await fileToBase64(item.file);
      // Check if a doc of this type already exists → use replace endpoint
      const exists = data?.documents?.some((d: any) => d.documentType === item.documentType);
      const url = exists
        ? `/api/admissions/applications/${encodeURIComponent(appId)}/documents/${item.documentType}`
        : `/api/admissions/applications/${encodeURIComponent(appId)}/documents`;
      const method = exists ? "PUT" : "POST";
      const body = { documentType: item.documentType, fileName: item.file.name, mimeType: item.file.type, fileData };
      let pct = 0;
      const fakeProgress = setInterval(() => { pct = Math.min(pct + 10, 90); setUploadQueue((q) => q.map((i) => i.id === item.id ? { ...i, progress: pct } : i)); }, 80);
      const r = exists
        ? await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ac.signal })
        : await uploadWithProgress(url, body, (p) => { clearInterval(fakeProgress); setUploadQueue((q) => q.map((i) => i.id === item.id ? { ...i, progress: p } : i)); }, ac.signal);
      clearInterval(fakeProgress);
      if (r.ok) {
        setUploadQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "done", progress: 100 } : i));
        toast({ title: `${DOC_LABEL[item.documentType]} uploaded` });
        void load(appId);
      } else {
        const err = await r.json().catch(() => ({}));
        setUploadQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "error", error: err.error ?? "Upload failed" } : i));
      }
    } catch (err: any) {
      const cancelled = err?.name === "AbortError";
      setUploadQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: cancelled ? "cancelled" : "error", error: cancelled ? undefined : String(err?.message ?? "Upload failed") } : i));
    }
  };

  const cancelUpload = (item: UploadItem) => { item.abortController?.abort(); };
  const retryUpload = (item: UploadItem) => { setUploadQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "queued", progress: 0, error: undefined } : i)); };
  const removeFromQueue = (id: string) => { setUploadQueue((q) => q.filter((i) => i.id !== id)); };

  const deleteDoc = async (docId: number) => {
    if (!token) { toast({ title: "Sign in to delete documents", variant: "destructive" }); return; }
    const r = await fetch(`/api/admissions/documents/${docId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { toast({ title: "Document removed" }); void load(appId); }
    else { const d = await r.json().catch(() => ({})); toast({ title: "Delete failed", description: d.error, variant: "destructive" }); }
  };

  const application = data?.application;
  const documents: any[] = data?.documents ?? [];
  const events: any[] = data?.events ?? [];
  const notifications: any[] = data?.notifications ?? [];
  const missingDocs: string[] = data?.missingDocuments ?? [];
  const interviews: any[] = data?.interviews ?? [];
  const tests: any[] = data?.tests ?? [];
  const profileCompletion = data?.profileCompletion ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Applicant Portal</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Application Dashboard</h1>
          {token && (
            <Button variant="outline" size="sm" onClick={() => { clearApplicantSession(); setLocation("/admissions/login"); }}>Sign out</Button>
          )}
        </div>
      </div>

      {/* Search */}
      {!params.id && (
        <div className="flex gap-2">
          <Input placeholder="Enter Application ID, e.g. APP-2026-…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (setAppId(searchInput), load(searchInput))} className="max-w-md" />
          <Button onClick={() => { setAppId(searchInput); load(searchInput); }}>Search</Button>
        </div>
      )}

      {loading && <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {data?.error && <div className="flex gap-2 rounded-lg border bg-destructive/10 p-4 text-destructive"><AlertCircle className="h-5 w-5 shrink-0" /><p>{data.error}</p></div>}

      {application && <>
        {/* Status strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Status", value: application.status.replace(/_/g, " "), colorClass: STATUS_COLOR[application.status] ?? "" },
            { label: "Reference", value: application.referenceNumber },
            { label: "Programme", value: application.program },
            { label: "Profile", value: `${profileCompletion}% complete` },
          ].map(({ label, value, colorClass }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`font-semibold capitalize rounded px-1 inline-block text-sm ${colorClass}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Profile completion bar */}
        {profileCompletion < 100 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4 pb-3 flex items-center gap-4">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Profile incomplete — {profileCompletion}% filled</p>
                <Progress value={profileCompletion} className="h-1.5 mt-1" />
              </div>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => setLocation("/admissions/profile")}>Complete profile</Button>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <span className="text-sm text-muted-foreground">{documents.length} uploaded · {missingDocs.length} required missing</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Uploaded documents */}
            {documents.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-start gap-3 rounded-xl border p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {doc.mimeType.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{DOC_LABEL[doc.documentType] ?? doc.documentType}</p>
                      <p className="truncate text-xs text-muted-foreground">{doc.fileName} · {(doc.fileSize / 1024).toFixed(0)} KB</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs font-medium capitalize ${DOC_STATUS_COLOR[doc.verificationStatus] ?? "text-muted-foreground"}`}>
                          {doc.verificationStatus === "verified" ? <CheckCircle2 className="inline h-3 w-3 mr-0.5" /> : doc.verificationStatus === "rejected" ? <AlertCircle className="inline h-3 w-3 mr-0.5" /> : <Clock className="inline h-3 w-3 mr-0.5" />}
                          {doc.verificationStatus}
                        </span>
                        {doc.reviewerComment && <span className="text-xs text-muted-foreground">· {doc.reviewerComment}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {token && <button className="text-muted-foreground hover:text-destructive" onClick={() => deleteDoc(doc.id)} title="Delete"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Missing documents alert */}
            {missingDocs.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Required documents missing:</p>
                <div className="flex flex-wrap gap-1">
                  {missingDocs.map((d) => <Badge key={d} variant="outline" className="text-xs capitalize">{DOC_LABEL[d] ?? d}</Badge>)}
                </div>
              </div>
            )}

            {/* Upload area */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)}>
                  {ALL_DOCS.map((d) => <option key={d} value={d}>{DOC_LABEL[d]}</option>)}
                </select>
                <span className="text-xs text-muted-foreground">PDF, JPEG, PNG · max 5 MB</span>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary hover:bg-muted/40"}`}
              >
                <Upload className={`h-8 w-8 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium">{isDragOver ? "Drop to upload" : "Drag & drop or click to browse"}</p>
                <p className="text-xs text-muted-foreground">Select document type above, then drop one or multiple files</p>
              </div>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf" className="hidden" onChange={onFilePick} />
            </div>

            {/* Upload queue */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Upload queue ({uploadQueue.length})</p>
                {uploadQueue.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {/* Preview */}
                    {item.preview ? (
                      <img src={item.preview} alt="" className="h-10 w-10 rounded object-cover border shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{DOC_LABEL[item.documentType]}</p>
                        <span className="text-xs text-muted-foreground truncate">{item.file.name}</span>
                      </div>
                      {item.status === "uploading" && <Progress value={item.progress} className="h-1.5" />}
                      {item.status === "error" && <p className="text-xs text-destructive">{item.error}</p>}
                      {item.status === "cancelled" && <p className="text-xs text-muted-foreground">Cancelled</p>}
                      {item.status === "done" && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Uploaded</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {item.status === "queued" && (
                        <><Button size="sm" onClick={() => startUpload(item)}>Upload</Button><button onClick={() => removeFromQueue(item.id)} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4" /></button></>
                      )}
                      {item.status === "uploading" && <button onClick={() => cancelUpload(item)} className="text-muted-foreground hover:text-destructive p-1" title="Cancel"><X className="h-4 w-4" /></button>}
                      {(item.status === "error" || item.status === "cancelled") && <button onClick={() => retryUpload(item)} className="text-primary p-1" title="Retry"><RotateCcw className="h-4 w-4" /></button>}
                      {item.status === "done" && <button onClick={() => removeFromQueue(item.id)} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4" /></button>}
                    </div>
                  </div>
                ))}
                {uploadQueue.some((i) => i.status === "queued") && (
                  <Button size="sm" onClick={() => uploadQueue.filter((i) => i.status === "queued").forEach(startUpload)}>Upload all queued</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interview schedule */}
        {interviews.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Interview schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {interviews.map((iv: any) => (
                <div key={iv.id} className="flex flex-col gap-1 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">{new Date(iv.scheduledAt).toLocaleString("en-IN")}</p>
                    <p className="text-sm text-muted-foreground capitalize">Mode: {iv.mode} · Status: {iv.status}</p>
                    {iv.notes && <p className="text-sm text-muted-foreground mt-1">{iv.notes}</p>}
                  </div>
                  {iv.result && <Badge variant="outline" className="w-fit capitalize">{iv.result}</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Entrance test */}
        {tests.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Entrance test</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tests.map((t: any) => (
                <div key={t.id} className="rounded-xl border p-4 space-y-1">
                  <p className="font-semibold">{new Date(t.scheduledAt).toLocaleString("en-IN")}</p>
                  <p className="text-sm text-muted-foreground">Center: {t.testCenter ?? "TBA"} · Seat: {t.seatNumber ?? "TBA"}</p>
                  {t.score != null && <p className="text-sm">Score: <strong>{t.score}</strong></p>}
                  {t.eligibilityDecision && <Badge variant="outline" className="capitalize">{t.eligibilityDecision}</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Timeline & notifications */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
              {events.slice(0, 10).map((ev: any) => (
                <div key={ev.id} className="border-l-2 border-primary pl-3">
                  <p className="text-sm font-medium">{ev.event}</p>
                  {ev.comment && <p className="text-xs text-muted-foreground">{ev.comment}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(ev.createdAt).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" />Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
              {notifications.slice(0, 8).map((n: any) => (
                <div key={n.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{n.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Letter download */}
        {["approved", "rejected", "waitlisted"].includes(application.status) && (
          <Card>
            <CardHeader><CardTitle>Admission letter</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Your admission decision letter is ready for download.</p>
              <Button asChild variant="outline">
                <a href={`/api/admissions/applications/${application.applicationId}/letter`} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />View / Print letter
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/admissions/profile")}><User className="mr-1.5 h-4 w-4" />Edit profile</Button>
          {token && <Button variant="outline" size="sm" onClick={() => { clearApplicantSession(); setLocation("/admissions/login"); }}>Sign out</Button>}
        </div>
      </>}
    </div>
  );
}
