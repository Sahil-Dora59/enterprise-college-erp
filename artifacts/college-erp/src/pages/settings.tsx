import { useEffect, useState } from "react";
import { Settings as SettingsIcon, ShieldCheck, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type RbacRole = { id: number; name: string; displayName: string; description: string | null; permissions: number[] };
type Permission = { id: number; key: string; displayName: string; module: string; action: string };

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("super_admin");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("erp_token");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/roles", { headers }).then((response) => response.json()),
      fetch("/api/permissions", { headers }).then((response) => response.json()),
    ]).then(([nextRoles, nextPermissions]) => {
      setRoles(Array.isArray(nextRoles) ? nextRoles : []);
      setPermissions(Array.isArray(nextPermissions) ? nextPermissions : []);
    }).catch(() => toast({ title: "Unable to load permissions", variant: "destructive" }));
  }, [toast]);

  const role = roles.find((item) => item.name === selectedRole);
  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
    (groups[permission.module] ||= []).push(permission);
    return groups;
  }, {});

  const togglePermission = (permissionId: number) => {
    setRoles((current) => current.map((item) => item.name !== selectedRole ? item : {
      ...item,
      permissions: item.permissions.includes(permissionId)
        ? item.permissions.filter((id) => id !== permissionId)
        : [...item.permissions, permissionId],
    }));
  };

  const savePermissions = async () => {
    if (!role) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/roles/${role.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("erp_token")}` },
        body: JSON.stringify({ permissionIds: role.permissions }),
      });
      if (!response.ok) throw new Error("Permission update failed");
      toast({ title: "Permissions saved", description: `${role.displayName} access has been updated.` });
    } catch (error) {
      toast({ title: "Unable to save permissions", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold tracking-tight">Settings</h2><p className="mt-1 text-muted-foreground">Manage your account and system access policies.</p></div>
    <Card className="max-w-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" />Account</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between border-b border-border/50 pb-3"><span className="text-muted-foreground">Name</span><span className="font-medium">{user?.name}</span></div><div className="flex justify-between border-b border-border/50 pb-3"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{user?.role?.replace("_", " ")}</span></div></CardContent></Card>
    {user?.role === "super_admin" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Role & permission management</CardTitle><CardDescription>Configure which modules each role can access. Changes apply on the next authenticated request.</CardDescription></CardHeader><CardContent className="space-y-5">
      <div className="flex flex-wrap gap-2">{roles.map((item) => <Button key={item.name} size="sm" variant={selectedRole === item.name ? "default" : "outline"} onClick={() => setSelectedRole(item.name)}>{item.displayName}</Button>)}</div>
      {role && <div className="rounded-lg border border-border/60 p-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">{role.displayName}</h3><p className="text-sm text-muted-foreground">{role.description}</p></div><Badge variant="secondary">{role.permissions.length} granted</Badge></div><div className="grid gap-4 sm:grid-cols-2">{Object.entries(groupedPermissions).map(([module, modulePermissions]) => <div key={module} className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{module}</p>{modulePermissions.map((permission) => <label key={permission.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={role.permissions.includes(permission.id)} onCheckedChange={() => togglePermission(permission.id)} /><span>{permission.displayName}</span></label>)}</div>)}</div><div className="mt-5 flex justify-end"><Button onClick={savePermissions} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save permissions"}</Button></div></div>}
    </CardContent></Card>}
  </div>;
}