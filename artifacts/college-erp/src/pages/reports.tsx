import { BarChart3, BookOpen, ClipboardCheck, CreditCard, FileBarChart, GraduationCap, Library, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reports = [
  ["Academic overview", "Departments, courses, semesters, and curriculum", "/academics", GraduationCap],
  ["Attendance reports", "Attendance rates and low-attendance records", "/attendance", ClipboardCheck],
  ["Examination results", "Marks, results, grade distribution, and performance", "/examination-dashboard", BarChart3],
  ["Faculty workload", "Assigned courses, credits, and teaching allocation", "/faculty", Users],
  ["Finance and fees", "Collection, dues, payment history, and summaries", "/administration", CreditCard],
  ["Library operations", "Catalog, borrowers, returns, and fines", "/library", Library],
  ["Assignments", "Deadlines, submissions, marks, and feedback", "/assignments", BookOpen],
];

export default function Reports() {
  return <div className="space-y-6"><div><h2 className="text-3xl font-bold tracking-tight">Report Center</h2><p className="mt-1 text-muted-foreground">One place to access every operational and academic report.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reports.map(([title, description, href, Icon]) => <Card key={title as string}><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title as string}</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">{description as string}</p><Button variant="outline" asChild><a href={href as string}>Open report</a></Button></CardContent></Card>)}</div><Card><CardHeader><CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5 text-primary" />Export-ready workflow</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Use the browser print action or export controls in each module to create PDF, CSV, and spreadsheet-ready outputs.</p></CardContent></Card></div>;
}