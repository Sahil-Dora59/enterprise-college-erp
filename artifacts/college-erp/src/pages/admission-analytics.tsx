import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Users, CheckCircle2, XCircle, Clock, Award, RefreshCw, BarChart2 } from "lucide-react";

function Bar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return <div className="h-2 w-full rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} /></div>;
}

export default function AdmissionAnalytics() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admissions/analytics", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) void load(); }, [token]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!data) {
    return <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground"><BarChart2 className="h-10 w-10" /><p>Failed to load analytics.</p><Button variant="outline" onClick={load}>Retry</Button></div>;
  }

  const stats = [
    { label: "Total applications", value: data.applications, icon: Users, color: "text-blue-600" },
    { label: "Approved", value: data.approvals, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Rejected", value: data.rejections, icon: XCircle, color: "text-red-500" },
    { label: "Pending review", value: data.pending, icon: Clock, color: "text-yellow-600" },
    { label: "Waitlisted", value: data.waitlisted, icon: Award, color: "text-orange-500" },
    { label: "Conversion rate", value: `${data.conversionRate}%`, icon: TrendingUp, color: "text-violet-600" },
    { label: "Avg review time", value: `${data.avgReviewHours}h`, icon: Clock, color: "text-sky-600" },
  ];

  const maxFunnel = Math.max(...(data.funnel?.map((f: any) => f.count) ?? [1]), 1);
  const maxProgram = Math.max(...(data.byProgram?.map((p: any) => p.count) ?? [1]), 1);
  const maxTrend = Math.max(...(data.trend?.map((t: any) => t.count) ?? [1]), 1);
  const maxOfficer = Math.max(...(data.officerPerformance?.map((o: any) => o.reviews) ?? [1]), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Admissions intelligence</p>
          <h1 className="text-3xl font-bold">Admission Analytics</h1>
          <p className="text-muted-foreground">Real-time insights into the admission pipeline.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="min-w-0">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Application trend */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />7-Day Application Trend</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.trend?.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {data.trend?.map((t: any) => (
              <div key={t.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="font-semibold">{t.count}</span>
                </div>
                <Bar value={t.count} max={maxTrend} color="bg-blue-500" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Status funnel */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4" />Admission Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.funnel?.filter((f: any) => f.count > 0).map((f: any) => (
              <div key={f.status} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{f.status.replace(/_/g, " ")}</span>
                  <span className="font-semibold">{f.count}</span>
                </div>
                <Bar value={f.count} max={maxFunnel} />
              </div>
            ))}
            {!data.funnel?.some((f: any) => f.count > 0) && <p className="text-sm text-muted-foreground">No applications yet.</p>}
          </CardContent>
        </Card>

        {/* Program popularity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Programme Popularity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.byProgram?.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {data.byProgram?.map((p: any) => (
              <div key={p.program} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1 mr-2">{p.program}</span>
                  <Badge variant="secondary">{p.count}</Badge>
                </div>
                <Bar value={p.count} max={maxProgram} color="bg-violet-500" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Officer performance */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Officer Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!data.officerPerformance?.length && <p className="text-sm text-muted-foreground">No officer review data yet.</p>}
            {data.officerPerformance?.map((o: any) => (
              <div key={o.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{o.name}</span>
                  <span className="font-semibold">{o.reviews} reviews</span>
                </div>
                <Bar value={o.reviews} max={maxOfficer} color="bg-emerald-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Conversion summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Conversion Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{data.applications}</p>
              <p className="text-sm text-muted-foreground mt-1">Total received</p>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{data.pending + data.waitlisted}</p>
              <p className="text-sm text-muted-foreground mt-1">In pipeline</p>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{data.conversionRate}%</p>
              <p className="text-sm text-muted-foreground mt-1">Conversion rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
