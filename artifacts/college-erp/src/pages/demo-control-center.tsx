import { BarChart3, Database, RefreshCw, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const roles = ["super_admin", "admin", "secretary", "faculty", "student", "accountant", "librarian"];
export default function DemoControlCenter() {
  const { user, demoEnabled, switchDemoRole } = useAuth();
  if (!demoEnabled) return null;
  return <div className="space-y-6">
    <div><div className="flex items-center gap-3"><h2 className="text-3xl font-bold tracking-tight">Demo Control Center</h2><Badge className="gap-1"><ShieldCheck className="h-3 w-3" />Development only</Badge></div><p className="mt-1 text-muted-foreground">Explore every ERP role with the same permission-aware experience used by production.</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Current active role</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold capitalize">{user?.role.replace("_", " ")}</p><p className="text-sm text-muted-foreground">{user?.name}</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Access permissions</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{user?.permissions.length}</p><p className="text-sm text-muted-foreground">Database-backed grants</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Demo data scope</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">ERP-wide</p><p className="text-sm text-muted-foreground">Shared realistic sample records</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Switch role</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{roles.map(role => <Button key={role} variant={user?.role === role ? "default" : "outline"} onClick={() => switchDemoRole(role)} className="capitalize">{role.replace("_", " ")}</Button>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Demo data operations</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Button variant="outline" disabled><RotateCcw className="mr-2 h-4 w-4" />Reset demo data</Button><Button variant="outline" disabled><Database className="mr-2 h-4 w-4" />Generate demo data</Button><Button variant="outline" disabled><RefreshCw className="mr-2 h-4 w-4" />Refresh demo database</Button><Button variant="outline" disabled><BarChart3 className="mr-2 h-4 w-4" />View statistics</Button></CardContent></Card>
  </div>;
}