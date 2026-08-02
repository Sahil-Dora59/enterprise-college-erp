import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, CreditCard, FileText, RefreshCw, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token")}` });
export default function StudentDashboard() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const response = await fetch(`/api/students/${id}/dashboard`, { headers: headers() });
    if (response.ok) setData(await response.json());
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id]);
  if (loading) return <div className="space-y-6"><Skeleton className="h-10 w-72" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div></div>;
  if (!data) return <div className="rounded-lg border p-8 text-center">Student dashboard unavailable.</div>;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><Button variant="outline" size="icon" asChild><Link href={`/students/${id}`}><ArrowLeft className="h-4 w-4" /></Link></Button><div><h2 className="text-3xl font-bold tracking-tight">Student Dashboard</h2><p className="text-muted-foreground">Academic progress and campus activity</p></div></div><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">Attendance</CardTitle><CheckCircle2 className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{data.attendance.percentage}%</div><Progress value={data.attendance.percentage} className="mt-2" /><p className="mt-2 text-xs text-muted-foreground">{data.attendance.present} of {data.attendance.total} records present</p></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">Fee status</CardTitle><CreditCard className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">${data.fees.outstanding.toLocaleString()}</div><p className="text-xs text-muted-foreground">Outstanding balance</p></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">Assignments</CardTitle><BookOpen className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{data.assignments.length}</div><p className="text-xs text-muted-foreground">Active assignments</p></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">Profile completion</CardTitle><UserRound className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{Math.round(data.profileCompletion)}%</div><Progress value={data.profileCompletion} className="mt-2" /></CardContent></Card>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Upcoming examinations</CardTitle></CardHeader><CardContent className="space-y-2">{data.upcomingExams.slice(0, 6).map((exam: any) => <div key={exam.id} className="flex items-center justify-between rounded-md border p-3"><span><span className="block font-medium">{exam.name}</span><span className="text-xs text-muted-foreground">{exam.examDate}</span></span><Badge variant="outline">{exam.type}</Badge></div>)}{!data.upcomingExams.length && <p className="text-sm text-muted-foreground">No upcoming examinations.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Recent notices</CardTitle></CardHeader><CardContent className="space-y-2">{data.notices.map((notice: any) => <div key={notice.id} className="flex items-center justify-between rounded-md border p-3"><span className="font-medium">{notice.title}</span><Badge variant="outline">{notice.priority}</Badge></div>)}{!data.notices.length && <p className="text-sm text-muted-foreground">No recent notices.</p>}</CardContent></Card>
    </div>
  </div>;
}