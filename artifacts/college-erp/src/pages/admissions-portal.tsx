import { Link } from "wouter";
import { ArrowRight, CheckCircle2, FileText, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdmissionsPortal() {
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-card"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><div className="flex items-center gap-3 font-bold"><GraduationCap className="h-7 w-7 text-primary" />Nexus University Admissions</div><Link href="/admissions/apply"><Button>Start application <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div></header>
    <main className="mx-auto max-w-6xl space-y-12 px-6 py-14">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center"><div><p className="mb-3 font-semibold uppercase tracking-[.2em] text-primary">Admissions 2026–27</p><h1 className="text-4xl font-bold tracking-tight md:text-6xl">Begin your next chapter with confidence.</h1><p className="mt-5 max-w-xl text-lg text-muted-foreground">Explore programs, check eligibility, and submit a secure online application. Save your progress and return whenever you are ready.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/admissions/apply"><Button size="lg">Apply online <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><a href="#information"><Button size="lg" variant="outline">Admission information</Button></a></div></div><Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle>Application journey</CardTitle></CardHeader><CardContent className="space-y-4">{["Complete your application", "Upload required documents", "Track review and decision"].map((item, i) => <div className="flex items-center gap-3" key={item}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">{i + 1}</span><span>{item}</span></div>)}</CardContent></Card></section>
      <section id="information" className="grid gap-4 md:grid-cols-3">{[
        ["Programs", "B.Tech Computer Science, BBA Business Administration, and B.Com Commerce."],
        ["Eligibility", "Applicants should have completed 10+2 or an equivalent qualification."],
        ["Documents", "Photo, signature, identity proof, certificates, and category documents where applicable."],
        ["Fee structure", "Program fees and payment instructions are shared during the offer stage."],
        ["FAQs", "Applications can be saved as drafts and edited before final submission."],
        ["Contact", "admissions@college.edu · +91 1800 123 456"],
      ].map(([title, content]) => <Card key={title}><CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{content}</CardContent></Card>)}</section>
      <section className="rounded-2xl border bg-card p-8"><div className="flex items-start gap-4"><ShieldCheck className="h-6 w-6 text-primary" /><div><h2 className="font-semibold">Secure and applicant-owned</h2><p className="mt-1 text-sm text-muted-foreground">Your application receives a unique reference number. You can save a draft, continue later, and track its review status.</p></div></div></section>
    </main>
  </div>;
}