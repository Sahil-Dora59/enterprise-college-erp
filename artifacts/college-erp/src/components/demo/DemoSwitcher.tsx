import { useState } from "react";
import { Link } from "wouter";
import { ChevronUp, FlaskConical, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const roles = [
  ["super_admin", "Super Admin"], ["admin", "Admin"], ["faculty", "Faculty"],
  ["student", "Student"], ["accountant", "Accountant"], ["librarian", "Librarian"],
];

export function DemoSwitcher() {
  const { user, demoEnabled, switchDemoRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  if (!demoEnabled || !user) return null;
  const switchRole = async (role: string) => {
    setSwitching(true);
    try { await switchDemoRole(role); } finally { setSwitching(false); }
  };
  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(20rem,calc(100vw-2rem))]">
      {open && <div className="mb-3 overflow-hidden rounded-2xl border bg-card p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <div><p className="text-sm font-semibold">Switch demo role</p><p className="text-xs text-muted-foreground">Uses real RBAC permissions</p></div>
          <Badge variant="secondary">DEMO</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {roles.map(([role, label]) => <Button key={role} variant={user.role === role ? "default" : "outline"} size="sm" disabled={switching} onClick={() => switchRole(role)} className="justify-start">
            {switching && user.role !== role ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}{label}
          </Button>)}
        </div>
        <Link href="/demo"><Button variant="ghost" size="sm" className="mt-2 w-full">Open Demo Control Center</Button></Link>
      </div>}
      <Button onClick={() => setOpen(!open)} className="ml-auto flex h-12 gap-2 rounded-full px-5 shadow-lg">
        <FlaskConical className="h-4 w-4" /><span className="hidden sm:inline">{user.role.replace("_", " ")}</span><ChevronUp className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
    </div>
  );
}