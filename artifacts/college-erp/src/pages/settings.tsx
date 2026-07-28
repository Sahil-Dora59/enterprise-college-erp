import { Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  return <div className="space-y-6"><div><h2 className="text-3xl font-bold tracking-tight">Settings</h2><p className="mt-1 text-muted-foreground">Manage your account preferences.</p></div><Card className="max-w-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" />Account</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between border-b border-border/50 pb-3"><span className="text-muted-foreground">Name</span><span className="font-medium">{user?.name}</span></div><div className="flex justify-between border-b border-border/50 pb-3"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{user?.role?.replace("_", " ")}</span></div></CardContent></Card></div>;
}