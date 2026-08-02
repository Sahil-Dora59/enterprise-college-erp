import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComponentType, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Shell } from '@/components/layout/Shell';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Students from '@/pages/students';
import StudentProfile from '@/pages/student-profile';
import Faculty from '@/pages/faculty';
import FacultyProfile from '@/pages/faculty-profile';
import Departments from '@/pages/departments';
import Courses from '@/pages/courses';
import Semesters from '@/pages/semesters';
import Attendance from '@/pages/attendance';
import Examinations from '@/pages/examinations';
import Marks from '@/pages/marks';
import Assignments from '@/pages/assignments';
import Library from '@/pages/library';
import Fees from '@/pages/fees';
import Notices from '@/pages/notices';
import Settings from '@/pages/settings';
import AiDashboard from '@/pages/ai-dashboard';
import AiChat from '@/pages/ai-chat';
import AiSettings from '@/pages/ai-settings';
import NotFound from '@/pages/not-found';
import AccessDenied from '@/pages/access-denied';
import DemoControlCenter from '@/pages/demo-control-center';
import ResetPassword from '@/pages/reset-password';
import AcademicManagement from '@/pages/academic-management';
import ExaminationDashboard from '@/pages/examination-dashboard';
import Administration from '@/pages/administration';
import StudentDashboard from '@/pages/student-dashboard';
import Reports from '@/pages/reports';
import AdmissionsPortal from '@/pages/admissions-portal';
import AdmissionApply from '@/pages/admission-apply';
import AdmissionTrack from '@/pages/admission-track';
import AdmissionCrm from '@/pages/admission-crm';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

// A component that handles auth checking and shell wrapping
function ProtectedRoute({ component: Component, permission, ...rest }: { component: ComponentType<any>, path: string, permission?: string }) {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }
  if (permission && !hasPermission(permission)) {
    return <Shell><AccessDenied /></Shell>;
  }

  return (
    <Shell>
      <Component {...rest} />
    </Shell>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to={`/dashboard/${user.role}`} /> : <Login />}
      </Route>
      <Route path="/reset-password"><ResetPassword /></Route>
      <Route path="/admissions"><AdmissionsPortal /></Route>
      <Route path="/admissions/apply"><AdmissionApply /></Route>
      <Route path="/admissions/track/:id"><AdmissionTrack /></Route>

      <Route path="/"><ProtectedRoute component={Dashboard} path="/" permission="dashboard.view" /></Route>
      {(["super_admin", "admin", "faculty", "student", "accountant", "librarian"] as const).map((role) => (
        <Route key={role} path={`/dashboard/${role}`}><ProtectedRoute component={Dashboard} path={`/dashboard/${role}`} permission="dashboard.view" /></Route>
      ))}
      <Route path="/students"><ProtectedRoute component={Students} path="/students" permission="students.view" /></Route>
      <Route path="/students/:id"><ProtectedRoute component={StudentProfile} path="/students/:id" permission="students.view" /></Route>
      <Route path="/students/:id/dashboard"><ProtectedRoute component={StudentDashboard} path="/students/:id/dashboard" permission="students.view" /></Route>
      <Route path="/faculty"><ProtectedRoute component={Faculty} path="/faculty" permission="faculty.view" /></Route>
      <Route path="/faculty/:id"><ProtectedRoute component={FacultyProfile} path="/faculty/:id" permission="faculty.view" /></Route>
      <Route path="/departments"><ProtectedRoute component={Departments} path="/departments" permission="departments.view" /></Route>
      <Route path="/courses"><ProtectedRoute component={Courses} path="/courses" permission="courses.view" /></Route>
      <Route path="/academics"><ProtectedRoute component={AcademicManagement} path="/academics" permission="courses.view" /></Route>
      <Route path="/semesters"><ProtectedRoute component={Semesters} path="/semesters" permission="semesters.view" /></Route>
      <Route path="/attendance"><ProtectedRoute component={Attendance} path="/attendance" permission="attendance.view" /></Route>
      <Route path="/examinations"><ProtectedRoute component={Examinations} path="/examinations" permission="examinations.view" /></Route>
      <Route path="/examination-dashboard"><ProtectedRoute component={ExaminationDashboard} path="/examination-dashboard" permission="examinations.view" /></Route>
      <Route path="/marks"><ProtectedRoute component={Marks} path="/marks" permission="marks.view" /></Route>
      <Route path="/assignments"><ProtectedRoute component={Assignments} path="/assignments" permission="assignments.view" /></Route>
      <Route path="/library"><ProtectedRoute component={Library} path="/library" permission="library.view" /></Route>
      <Route path="/fees"><ProtectedRoute component={Fees} path="/fees" permission="fees.view" /></Route>
      <Route path="/administration"><ProtectedRoute component={Administration} path="/administration" permission="fees.view" /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} path="/reports" permission="dashboard.view" /></Route>
      <Route path="/notices"><ProtectedRoute component={Notices} path="/notices" permission="notices.view" /></Route>
      <Route path="/ai"><ProtectedRoute component={AiDashboard} path="/ai" permission="ai.view" /></Route>
      <Route path="/ai/chat"><ProtectedRoute component={AiChat} path="/ai/chat" permission="ai.view" /></Route>
      <Route path="/ai/settings"><ProtectedRoute component={AiSettings} path="/ai/settings" permission="ai.manage" /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} path="/settings" permission="settings.manage" /></Route>
      <Route path="/demo"><ProtectedRoute component={DemoControlCenter} path="/demo" permission="dashboard.view" /></Route>
      <Route path="/admissions/crm"><ProtectedRoute component={AdmissionCrm} path="/admissions/crm" permission="dashboard.view" /></Route>
      
      <Route>
        <Shell>
          <NotFound />
        </Shell>
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("erp_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
