import { useEffect, useState } from "react";
import { Award, BarChart3, BookOpenCheck, CalendarDays, CheckCircle2, FileBarChart, RefreshCw, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Analytics = { totalMarks: number; passed: number; backlogs: number; passPercentage: number; gradeDistribution: { grade: string; count: number }[]; subjectAnalysis: { code: string | null; name: string | null; total: number; passPercentage: number }[]; topPerformers: { studentId: number; percentage: number }[] };
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token")}` });

export default function ExaminationDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    setRefreshing(true);
    try {
      const [analyticsResponse, examsResponse] = await Promise.all([fetch("/api/marks/analytics", { headers: headers() }), fetch("/api/examinations", { headers: headers() })]);
      if (analyticsResponse.ok) setAnalytics(await analyticsResponse.json());
      if (examsResponse.ok) { const value = await examsResponse.json(); setExams(Array.isArray(value) ? value : value.data || []); }
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { void load(); }, []);
  const metrics = [
    ["Pass percentage", analytics ? `${analytics.passPercentage}%` : "—", CheckCircle2],
    ["Marks recorded", analytics?.totalMarks ?? "—", BookOpenCheck],
    ["Backlogs", analytics?.backlogs ?? "—", TriangleAlert],
    ["Top performers", analytics?.topPerformers.length ?? "—", Award],
  ] as const;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-3"><h2 className="text-3xl font-bold tracking-tight">Examination Dashboard</h2><Badge variant="secondary">Results intelligence</Badge></div><p className="mt-1 text-muted-foreground">Manage exam sessions, marks verification, result publishing, and academic performance.</p></div><Button variant="outline" onClick={() => void load()} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <Card key={label}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{value}</div>}</CardContent></Card>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Exam calendar</CardTitle></CardHeader><CardContent className="space-y-3">{exams.slice(0, 8).map((exam) => <div key={exam.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{exam.name}</p><p className="text-xs text-muted-foreground">{exam.courseName || "Course"} · {exam.examDate}</p></div><Badge variant="outline" className="capitalize">{exam.type || "exam"}</Badge></div>)}{!exams.length && <p className="text-sm text-muted-foreground">No examinations scheduled.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Grade distribution</CardTitle></CardHeader><CardContent className="space-y-3">{analytics?.gradeDistribution.map((item) => <div key={item.grade} className="flex items-center gap-3"><span className="w-10 font-semibold">{item.grade}</span><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${analytics.totalMarks ? Math.min(100, item.count / analytics.totalMarks * 100) : 0}%` }} /></div><span className="text-sm text-muted-foreground">{item.count}</span></div>) || <p className="text-sm text-muted-foreground">No marks available.</p>}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5 text-primary" />Subject analysis</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{analytics?.subjectAnalysis.map((subject) => <div key={subject.code || subject.name} className="rounded-lg border p-4"><p className="font-medium">{subject.code} · {subject.name}</p><p className="mt-2 text-2xl font-bold">{subject.passPercentage}%</p><p className="text-xs text-muted-foreground">pass rate across {subject.total} marks</p></div>) || <p className="text-sm text-muted-foreground">No subject results available.</p>}</CardContent></Card>
  </div>;
}