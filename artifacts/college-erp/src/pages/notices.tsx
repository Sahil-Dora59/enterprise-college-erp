import { useState } from "react";
import { Bell, Plus, Search } from "lucide-react";
import { useCreateNotice, useListNotices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Notices() {
  const [search, setSearch] = useState("");
  const { data: notices = [], isLoading } = useListNotices();
  const createNotice = useCreateNotice();
  const { toast } = useToast();
  const filtered = notices.filter((n) => `${n.title} ${n.content}`.toLowerCase().includes(search.toLowerCase()));

  const addSampleNotice = async () => {
    try {
      await createNotice.mutateAsync({
        data: {
          title: "New campus announcement",
          content: "Please check the academic calendar for the latest updates.",
          priority: "medium",
          targetRole: "all",
          publishedAt: new Date().toISOString(),
        },
      });
      toast({ title: "Notice published" });
    } catch (error) {
      toast({ title: "Unable to publish notice", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-3xl font-bold tracking-tight">Notices</h2><p className="mt-1 text-muted-foreground">Keep the college community informed.</p></div>
        <Button onClick={addSampleNotice} disabled={createNotice.isPending}><Plus className="mr-2 h-4 w-4" />Publish notice</Button>
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search notices..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {isLoading ? <p className="text-muted-foreground">Loading notices...</p> : filtered.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-2 py-14 text-muted-foreground"><Bell className="h-10 w-10" /><p>No notices found.</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{filtered.map((notice) => <Card key={notice.id}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="text-lg">{notice.title}</CardTitle><Badge variant={notice.priority === "high" ? "destructive" : "secondary"}>{notice.priority}</Badge></div></CardHeader><CardContent><p className="text-sm text-muted-foreground">{notice.content}</p><p className="mt-4 text-xs text-muted-foreground">{new Date(notice.publishedAt).toLocaleDateString()} · {notice.targetRole}</p></CardContent></Card>)}</div>}
    </div>
  );
}