import {
  useGetDashboardStats,
  useGetEnrollmentChart,
  useGetFeeCollectionChart,
  useGetAttendanceOverview,
  useGetRecentActivity,
  useListNotices
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, GraduationCap, BookOpen, Building2, 
  CreditCard, CalendarDays, Library, Activity, Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

const STATS_CONFIG = [
  { key: "totalStudents", title: "Students", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "totalFaculty", title: "Faculty", icon: GraduationCap, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { key: "totalCourses", title: "Courses", icon: BookOpen, color: "text-violet-500", bg: "bg-violet-500/10" },
  { key: "totalDepartments", title: "Departments", icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10" },
  { key: "pendingFees", title: "Pending Fees", icon: CreditCard, color: "text-amber-500", bg: "bg-amber-500/10", isCurrency: true },
  { key: "todayAttendanceRate", title: "Attendance Today", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10", isPercent: true },
  { key: "upcomingExams", title: "Upcoming Exams", icon: CalendarDays, color: "text-rose-500", bg: "bg-rose-500/10" },
  { key: "totalBooks", title: "Library Books", icon: Library, color: "text-cyan-500", bg: "bg-cyan-500/10" }
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: enrollmentData } = useGetEnrollmentChart();
  const { data: feeData } = useGetFeeCollectionChart();
  const { data: attendanceData } = useGetAttendanceOverview();
  const { data: recentActivity } = useGetRecentActivity();
  const { data: noticesData } = useListNotices({ limit: 5 });

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const role = user?.role ?? "student";
  const roleTitles: Record<string, string> = {
    super_admin: "System Command Center",
    admin: "Administration Overview",
    faculty: "Faculty Workspace",
    student: "My Academic Dashboard",
    accountant: "Finance Overview",
    librarian: "Library Operations",
  };
  const visibleStats = role === "student"
    ? STATS_CONFIG.filter((item) => ["todayAttendanceRate", "upcomingExams"].includes(item.key))
    : role === "faculty"
      ? STATS_CONFIG.filter((item) => ["totalStudents", "totalCourses", "todayAttendanceRate", "upcomingExams"].includes(item.key))
      : role === "accountant"
        ? STATS_CONFIG.filter((item) => ["totalStudents", "pendingFees"].includes(item.key))
        : role === "librarian"
          ? STATS_CONFIG.filter((item) => ["totalStudents", "totalBooks"].includes(item.key))
          : STATS_CONFIG;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{roleTitles[role] ?? "Dashboard"}</h2>
          <p className="mt-1 text-muted-foreground capitalize">{role.replace("_", " ")} workspace</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visibleStats.map((config) => (
          <Card key={config.key} className="border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${config.bg} ${config.color}`}>
                <config.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{config.title}</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">
                    {config.isCurrency && "$"}
                    {(stats as any)?.[config.key]?.toLocaleString() || 0}
                    {config.isPercent && "%"}
                  </h3>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>Student enrollments over the past semesters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {enrollmentData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrollmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Fee Collection</CardTitle>
            <CardDescription>Current semester fee status</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center">
            <div className="h-[250px] w-full">
              {feeData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {feeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : index === 1 ? "hsl(var(--amber-500))" : "hsl(var(--destructive))"} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
            <div className="flex justify-center gap-4 text-sm mt-2">
              {feeData?.map((entry, i) => (
                <div key={entry.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-amber-500' : 'bg-destructive'}`} />
                  <span className="text-muted-foreground">{entry.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!recentActivity ? (
                <Skeleton className="h-[200px] w-full" />
              ) : recentActivity.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              ) : (
                recentActivity.map((activity, i) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                      {i !== recentActivity.length - 1 && <div className="w-px h-full bg-border mt-2" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{activity.actorName}</span>
                        <span>•</span>
                        <span>{format(new Date(activity.timestamp), "MMM d, h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Notice Board</CardTitle>
              <CardDescription>Latest announcements</CardDescription>
            </div>
            <div className="bg-primary/10 p-2 rounded-md">
              <Bell className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-2">
              {!noticesData ? (
                <Skeleton className="h-[200px] w-full" />
              ) : noticesData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No active notices</p>
              ) : (
                noticesData.map(notice => (
                  <div key={notice.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-semibold truncate pr-2">{notice.title}</h4>
                      <Badge variant={notice.priority === 'high' ? 'destructive' : notice.priority === 'medium' ? 'secondary' : 'default'} className="text-[10px] px-1.5 py-0">
                        {notice.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {format(new Date(notice.publishedAt), "MMM d, yyyy")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
