import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, ClipboardCheck, Clock3, FileBarChart, GraduationCap, Layers3, RefreshCw, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type AcademicData = {
  departments: any[];
  semesters: any[];
  courses: any[];
  assignments: any[];
  exams: any[];
  attendance: any[];
};

const tokenHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token")}` });

export default function AcademicManagement() {
  const [data, setData] = useState<AcademicData>({ departments: [], semesters: [], courses: [], assignments: [], exams: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const headers = tokenHeaders();
      const responses = await Promise.all([
        fetch("/api/departments", { headers }),
        fetch("/api/semesters", { headers }),
        fetch("/api/courses", { headers }),
        fetch("/api/assignments", { headers }),
        fetch("/api/examinations", { headers }),
        fetch("/api/attendance", { headers }),
      ]);
      const values = await Promise.all(responses.map(async (response) => response.ok ? response.json() : []));
      setData({
        departments: Array.isArray(values[0]) ? values[0] : values[0]?.data ?? [],
        semesters: Array.isArray(values[1]) ? values[1] : values[1]?.data ?? [],
        courses: Array.isArray(values[2]) ? values[2] : values[2]?.data ?? [],
        assignments: Array.isArray(values[3]) ? values[3] : values[3]?.data ?? [],
        exams: Array.isArray(values[4]) ? values[4] : values[4]?.data ?? [],
        attendance: Array.isArray(values[5]) ? values[5] : values[5]?.data ?? [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);
  const activeSemesters = useMemo(() => data.semesters.filter((semester) => semester.isActive).length, [data.semesters]);

  const metrics = [
    ["Departments", data.departments.length, GraduationCap],
    ["Courses & subjects", data.courses.length, BookOpen],
    ["Active semesters", activeSemesters, Layers3],
    ["Assignments", data.assignments.length, ClipboardCheck],
  ] as const;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><div className="flex items-center gap-3"><h2 className="text-3xl font-bold tracking-tight">Academic Management</h2><Badge variant="secondary">ERP workspace</Badge></div><p className="mt-1 text-muted-foreground">Coordinate curriculum, teaching delivery, attendance, assessments, and academic reporting.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh data</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <Card key={label}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-16" /> : <><div className="text-2xl font-bold">{value}</div><p className="text-xs text-muted-foreground">Live academic records</p></>}</CardContent></Card>)}</div>
    <Tabs defaultValue="curriculum" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
        <TabsTrigger value="curriculum"><BookOpen className="mr-2 h-4 w-4" />Curriculum</TabsTrigger>
        <TabsTrigger value="delivery"><Clock3 className="mr-2 h-4 w-4" />Delivery</TabsTrigger>
        <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" />Calendar</TabsTrigger>
        <TabsTrigger value="reports"><FileBarChart className="mr-2 h-4 w-4" />Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="curriculum"><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>Departments</CardTitle><CardDescription>Academic organization</CardDescription></CardHeader><CardContent className="space-y-2">{data.departments.slice(0, 6).map((item) => <div key={item.id} className="flex justify-between text-sm"><span>{item.name}</span><Badge variant="outline">{item.code || "Active"}</Badge></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Academic sessions</CardTitle><CardDescription>Semester timeline</CardDescription></CardHeader><CardContent className="space-y-2">{data.semesters.slice(0, 6).map((item) => <div key={item.id} className="flex justify-between text-sm"><span>{item.name}</span><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Current" : "Planned"}</Badge></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Course catalog</CardTitle><CardDescription>Credits and faculty mapping</CardDescription></CardHeader><CardContent className="space-y-2">{data.courses.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between text-sm"><span className="truncate">{item.code} · {item.name}</span><Badge variant="outline">{item.credits ?? 0} cr</Badge></div>)}</CardContent></Card></div></TabsContent>
      <TabsContent value="delivery"><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>Attendance</CardTitle><CardDescription>Daily and subject attendance records</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold">{data.attendance.length}</div><p className="text-sm text-muted-foreground">records available for reporting</p></CardContent></Card><Card><CardHeader><CardTitle>Assignments</CardTitle><CardDescription>Deadlines and submissions</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold">{data.assignments.length}</div><p className="text-sm text-muted-foreground">assessment activities</p></CardContent></Card><Card><CardHeader><CardTitle>Teaching delivery</CardTitle><CardDescription>Faculty course allocation</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-primary" />Use Faculty Workload for assigned subjects and credits.</div></CardContent></Card></div></TabsContent>
      <TabsContent value="calendar"><Card><CardHeader><CardTitle>Academic calendar</CardTitle><CardDescription>Upcoming academic activity from the existing examinations, assignments, and notices modules.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-4"><p className="text-sm font-medium">Upcoming exams</p><p className="mt-2 text-2xl font-bold">{data.exams.length}</p></div><div className="rounded-lg border p-4"><p className="text-sm font-medium">Assignment deadlines</p><p className="mt-2 text-2xl font-bold">{data.assignments.length}</p></div><div className="rounded-lg border p-4"><p className="text-sm font-medium">Active semester</p><p className="mt-2 text-2xl font-bold">{activeSemesters}</p></div></CardContent></Card></TabsContent>
      <TabsContent value="reports"><Card><CardHeader><CardTitle>Academic reports</CardTitle><CardDescription>Existing reporting surfaces are grouped here for quick access.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Button variant="outline" asChild><a href="/attendance">Attendance report</a></Button><Button variant="outline" asChild><a href="/assignments">Assignment report</a></Button><Button variant="outline" asChild><a href="/examinations">Examination report</a></Button><Button variant="outline" asChild><a href="/faculty">Faculty workload</a></Button></CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}