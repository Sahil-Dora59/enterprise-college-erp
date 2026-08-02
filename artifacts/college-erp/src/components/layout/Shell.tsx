import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Users, GraduationCap, Building2, BookOpen, 
  CalendarDays, ClipboardCheck, FileText, CheckCircle, 
  FileEdit, Library, CreditCard, Bell, Settings, LogOut,
   Menu, X, Bot, FlaskConical, Moon, Languages, CircleHelp, UserRound, Loader2, Layers3
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DemoSwitcher } from "@/components/demo/DemoSwitcher";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, permission: "dashboard.view" },
  { title: "Students", href: "/students", icon: Users, permission: "students.view" },
  { title: "Faculty", href: "/faculty", icon: GraduationCap, permission: "faculty.view" },
  { title: "Departments", href: "/departments", icon: Building2, permission: "departments.view" },
  { title: "Courses", href: "/courses", icon: BookOpen, permission: "courses.view" },
  { title: "Academic Management", href: "/academics", icon: Layers3, permission: "courses.view" },
  { title: "Semesters", href: "/semesters", icon: CalendarDays, permission: "semesters.view" },
  { title: "Attendance", href: "/attendance", icon: ClipboardCheck, permission: "attendance.view" },
  { title: "Examinations", href: "/examinations", icon: FileText, permission: "examinations.view" },
  { title: "Marks", href: "/marks", icon: CheckCircle, permission: "marks.view" },
  { title: "Assignments", href: "/assignments", icon: FileEdit, permission: "assignments.view" },
  { title: "Library", href: "/library", icon: Library, permission: "library.view" },
  { title: "Fees", href: "/fees", icon: CreditCard, permission: "fees.view" },
  { title: "Notices", href: "/notices", icon: Bell, permission: "notices.view" },
  { title: "AI Assistant", href: "/ai", icon: Bot, permission: "ai.view" },
  { title: "Settings", href: "/settings", icon: Settings, permission: "settings.manage" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout, hasPermission, demoEnabled } = useAuth();
  const [location, setLocation] = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();

  if (!user) return null; // Or a loading spinner, but Auth wrapper should handle it

  const filteredNav = navItems.filter(item => hasPermission(item.permission));
  if (demoEnabled) filteredNav.push({ title: "Demo Center", href: "/demo", icon: FlaskConical, permission: "dashboard.view" });

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      localStorage.setItem("erp_theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
      await logout();
      toast({ title: "Successfully signed out", description: "Your session has been securely closed." });
      setLocation("/login");
    } finally {
      setIsSigningOut(false);
      setLogoutOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-6 flex items-center gap-3 font-semibold text-xl tracking-tight">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
          <GraduationCap className="h-5 w-5" />
        </div>
        Nexus ERP
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {filteredNav.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarImage src={user.avatarUrl || ""} />
            <AvatarFallback className="bg-sidebar-accent text-xs">{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-sidebar-foreground/60 truncate capitalize">{user.role.replace('_', ' ')}</span>
          </div>
           <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setLogoutOpen(true)} aria-label="Open sign out confirmation">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 border-r border-sidebar-border h-screen sticky top-0">
        <SidebarContent />
      </div>
      <DemoSwitcher />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b bg-card px-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar border-none">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold tracking-tight hidden sm:block text-foreground">
              {filteredNav.find(item => location === item.href || (item.href !== "/" && location.startsWith(item.href)))?.title || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2 text-muted-foreground">
              <Bell className="h-4 w-4" />
              <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border-none">3</Badge>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 gap-2 rounded-full px-2 hover:bg-muted"
                  aria-label="Open user profile menu"
                >
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={user.avatarUrl || ""} />
                    <AvatarFallback className="text-xs">
                      {user.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem asChild><Link href="/settings"><span className="flex w-full cursor-pointer items-center"><UserRound className="mr-2 h-4 w-4" />My Profile</span></Link></DropdownMenuItem>
                 <DropdownMenuItem asChild><Link href="/settings"><span className="flex w-full cursor-pointer items-center"><Settings className="mr-2 h-4 w-4" />Settings</span></Link></DropdownMenuItem>
                 {demoEnabled && <DropdownMenuItem asChild><Link href="/demo"><span className="flex w-full cursor-pointer items-center"><FlaskConical className="mr-2 h-4 w-4" />Demo Switcher</span></Link></DropdownMenuItem>}
          <DropdownMenuItem onClick={() => { const dark = !document.documentElement.classList.contains("dark"); document.documentElement.classList.toggle("dark", dark); localStorage.setItem("erp_theme", dark ? "dark" : "light"); }}><Moon className="mr-2 h-4 w-4" />Theme</DropdownMenuItem>
                 <DropdownMenuItem disabled><Languages className="mr-2 h-4 w-4" />Language <span className="ml-auto text-xs text-muted-foreground">Soon</span></DropdownMenuItem>
                 <DropdownMenuItem onClick={() => window.open("mailto:it-support@college.edu")}><CircleHelp className="mr-2 h-4 w-4" />Help</DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={() => setLogoutOpen(true)} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-destructive" />Sign out</AlertDialogTitle>
            <AlertDialogDescription>
              You are signed in as <span className="font-semibold text-foreground">{user.name}</span> ({user.role.replace("_", " ")}). Are you sure you want to sign out? You will return to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleLogout(); }} disabled={isSigningOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSigningOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSigningOut ? "Signing you out..." : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
