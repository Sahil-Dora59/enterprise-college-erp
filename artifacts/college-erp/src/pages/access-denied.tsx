import { ShieldX } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md border-border/50 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <ShieldX className="h-12 w-12 text-destructive" />
          <div><h1 className="text-2xl font-bold">Access Denied</h1><p className="mt-2 text-muted-foreground">You do not have permission to access this module.</p></div>
          <Button asChild><Link href="/">Return to dashboard</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}