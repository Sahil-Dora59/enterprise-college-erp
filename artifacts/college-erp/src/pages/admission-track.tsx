import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdmissionTrack() {
  const [id, setId] = useState(""); const [data, setData] = useState<any>(null);
  const search = async () => { const response = await fetch(`/api/admissions/applications/${encodeURIComponent(id)}`); setData(response.ok ? await response.json() : { error: "Application not found" }); };
  return <div className="mx-auto max-w-2xl space-y-6 px-6 py-16"><h1 className="text-3xl font-bold">Track your application</h1><div className="flex gap-2"><Input placeholder="Application ID, e.g. APP-2026-..." value={id} onChange={(e) => setId(e.target.value)} /><Button onClick={search}>Search</Button></div>{data && (data.error ? <p className="text-destructive">{data.error}</p> : <Card><CardHeader><CardTitle>{data.application.applicantName}</CardTitle></CardHeader><CardContent><p className="font-medium">Status: <span className="capitalize">{data.application.status.replace("_"," ")}</span></p><p className="text-sm text-muted-foreground">Reference: {data.application.referenceNumber}</p><div className="mt-5 space-y-3">{data.events.map((event: any) => <div className="border-l-2 border-primary pl-3 text-sm" key={event.id}><p>{event.event}</p><p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p></div>)}</div></CardContent></Card>)}</div>;
}