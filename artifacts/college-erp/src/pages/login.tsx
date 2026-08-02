import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, GraduationCap, LockKeyhole, Mail, ShieldCheck, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  useEffect(() => { form.setFocus("email"); }, [form]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsSubmitting(true);
      const authenticatedUser = await login({ ...data, rememberMe });
      toast({ title: "Login successful" });
      setLocation(`/dashboard/${authenticatedUser.role}`);
    } catch (err: any) {
      toast({ 
        title: "Unable to sign in",
        description: err?.response?.data?.error || (err instanceof Error && err.message.includes("fetch") ? "The authentication service is unavailable. Please try again." : err.message || "Check your email and password and try again."),
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestReset = async () => {
    const email = forgotEmail || form.getValues("email");
    if (!z.string().email().safeParse(email).success) {
      toast({ title: "Enter your email first", description: "Use your institution email to request a reset.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      toast({ title: "Reset request received", description: result.message });
    } catch {
      toast({ title: "Unable to contact authentication service", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_420px] relative z-10">
        <div className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"><ShieldCheck className="h-4 w-4" /> Secure campus access</div>
          <h1 className="max-w-xl text-5xl font-bold tracking-tight text-foreground">Everything your institution needs, in one secure workspace.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">Manage academics, people, finance, and campus operations with confidence.</p>
          <div className="mt-8 flex gap-6 text-sm text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Enterprise RBAC</span><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-primary" />Protected sessions</span></div>
        </div>
      <div className="w-full max-w-md relative z-10 lg:justify-self-end">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3 font-bold text-3xl tracking-tight text-foreground">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-lg shadow-primary/20">
              <GraduationCap className="h-8 w-8" />
            </div>
            Nexus ERP
          </div>
        </div>

        <Card className="border-border/50 shadow-xl shadow-slate-200/50 dark:shadow-black/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                       <div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input type="email" autoComplete="email" placeholder="name@institution.edu" {...field} className="bg-background pl-10" /></div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                       <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" {...field} className="bg-background pl-10 pr-10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-between pt-2"><label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />Remember me</label><button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => { setForgotEmail(form.getValues("email")); void requestReset(); }}>Forgot password?</button></div>
                <Button type="submit" className="w-full mt-4 h-11" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing you in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6 text-sm text-muted-foreground">
            Having trouble signing in? Contact IT Support.
          </CardFooter>
        </Card>
      </div></div>
    </div>
  );
}
