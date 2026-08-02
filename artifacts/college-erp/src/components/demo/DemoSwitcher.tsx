import { useState } from "react";
import { Link } from "wouter";
import { ChevronUp, FlaskConical, RefreshCw, Crown, Shield, FolderKanban, GraduationCap, UserRound, WalletCards, LibraryBig, Check, Circle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const roles = [
  ["super_admin", "Super Admin", Crown, "MI"], ["admin", "Admin", Shield, "AM"],
  ["secretary", "Secretary", FolderKanban, "KN"], ["faculty", "Faculty", GraduationCap, "PS"],
  ["student", "Student", UserRound, "AK"], ["accountant", "Accountant", WalletCards, "NV"],
  ["librarian", "Librarian", LibraryBig, "RD"],
] as const;

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
    <div className="fixed bottom-4 right-4 z-[60] w-[min(22rem,calc(100vw-2rem))]">
      {open && <div role="menu" aria-label="Demo role switcher" className="mb-3 overflow-hidden rounded-2xl border border-primary/20 bg-card/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold">Enterprise Demo Switcher</p><p className="text-xs text-muted-foreground">Instantly explore database-backed RBAC</p></div>
          <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]"><FlaskConical className="h-3 w-3" /> DEMO</Badge>
        </div>
        <div className="grid gap-1.5">
          {roles.map(([role, label, Icon, initials]) => <button key={role} role="menuitem" type="button" disabled={switching} onClick={() => switchRole(role)} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${user.role === role ? "border-primary bg-primary/10" : "border-transparent hover:border-border hover:bg-muted"}`}>
            <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-[10px] text-primary"><Icon className="h-4 w-4" /></AvatarFallback></Avatar>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="block text-[11px] capitalize text-muted-foreground">{user.role === role ? "Current user" : "Demo account"}</span></span>
            {switching && user.role !== role ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : user.role === role ? <Check className="h-4 w-4 text-primary" /> : <Circle className="h-2 w-2 fill-muted-foreground text-muted-foreground" />}
          </button>)}
        </div>
        <Link href="/demo"><Button variant="ghost" size="sm" className="mt-2 w-full">Open Demo Control Center</Button></Link>
      </div>}
      <Button aria-expanded={open} aria-controls="demo-role-menu" onClick={() => setOpen(!open)} className="ml-auto flex h-12 gap-2 rounded-full border border-white/20 bg-primary/90 px-5 shadow-lg backdrop-blur-xl hover:bg-primary">
        <FlaskConical className="h-4 w-4" /><span className="hidden sm:inline">Demo · {user.name}</span><ChevronUp className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
    </div>
  );
}