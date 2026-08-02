import { useEffect, useState } from "react";
import { BookCopy, Bus, CircleDollarSign, CreditCard, FileBarChart, Home, Library, Package, RefreshCw, Users, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Summary = { finance: { feeRecords: number; collected: number; outstanding: number }; library: { books: number; activeBorrows: number; overdueBorrows: number }; people: { students: number; faculty: number }; readiness: Record<string, boolean> };
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token")}` });

export default function Administration() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/administration/summary", { headers: headers() });
      if (response.ok) setSummary(await response.json());
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { void load(); }, []);
  const metrics = [
    ["Collected fees", summary ? `$${summary.finance.collected.toLocaleString()}` : "—", CircleDollarSign],
    ["Outstanding dues", summary ? `$${summary.finance.outstanding.toLocaleString()}` : "—", CreditCard],
    ["Library books", summary?.library.books ?? "—", BookCopy],
    ["Active borrowers", summary?.library.activeBorrows ?? "—", Library],
  ] as const;
  const upcoming = [
    ["Payroll", WalletCards, summary?.readiness.payroll],
    ["Hostel", Home, summary?.readiness.hostel],
    ["Transport", Bus, summary?.readiness.transport],
    ["Inventory", Package, summary?.readiness.inventory],
  ] as const;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-3"><h2 className="text-3xl font-bold tracking-tight">Administrative Operations</h2><Badge variant="secondary">Enterprise workspace</Badge></div><p className="mt-1 text-muted-foreground">Finance, accounting, library, and operational readiness in one view.</p></div><Button variant="outline" onClick={() => void load()} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <Card key={label}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}<p className="text-xs text-muted-foreground">Live ERP records</p></CardContent></Card>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5 text-primary" />Finance and people</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border p-4"><Users className="mb-2 h-4 w-4 text-primary" /><p className="text-sm text-muted-foreground">Students</p><p className="text-2xl font-bold">{summary?.people.students ?? "—"}</p></div><div className="rounded-lg border p-4"><Users className="mb-2 h-4 w-4 text-primary" /><p className="text-sm text-muted-foreground">Faculty</p><p className="text-2xl font-bold">{summary?.people.faculty ?? "—"}</p></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Operational modules</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{upcoming.map(([label, Icon, ready]) => <div key={label} className="flex items-center justify-between rounded-lg border p-3"><span className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 text-muted-foreground" />{label}</span><Badge variant={ready ? "default" : "outline"}>{ready ? "Available" : "Next module"}</Badge></div>)}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Administrative shortcuts</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Button variant="outline" asChild><a href="/fees">Fee collection</a></Button><Button variant="outline" asChild><a href="/library">Library catalog</a></Button><Button variant="outline" asChild><a href="/reports">Reports</a></Button></CardContent></Card>
  </div>;
}