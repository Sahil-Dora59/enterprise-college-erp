import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import NotFound from '@/pages/not-found';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

// A component that handles auth checking and shell wrapping
function ProtectedRoute({ component: Component, ...rest }: { component: any, path: string }) {
  const { user, isLoading } = useAuth();

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
        {user ? <Redirect to="/" /> : <Login />}
      </Route>

      <Route path="/" component={() => <ProtectedRoute component={Dashboard} path="/" />} />
      <Route path="/students" component={() => <ProtectedRoute component={Students} path="/students" />} />
      <Route path="/students/:id" component={() => <ProtectedRoute component={StudentProfile} path="/students/:id" />} />
      <Route path="/faculty" component={() => <ProtectedRoute component={Faculty} path="/faculty" />} />
      <Route path="/faculty/:id" component={() => <ProtectedRoute component={FacultyProfile} path="/faculty/:id" />} />
      <Route path="/departments" component={() => <ProtectedRoute component={Departments} path="/departments" />} />
      <Route path="/courses" component={() => <ProtectedRoute component={Courses} path="/courses" />} />
      <Route path="/semesters" component={() => <ProtectedRoute component={Semesters} path="/semesters" />} />
      <Route path="/attendance" component={() => <ProtectedRoute component={Attendance} path="/attendance" />} />
      <Route path="/examinations" component={() => <ProtectedRoute component={Examinations} path="/examinations" />} />
      <Route path="/marks" component={() => <ProtectedRoute component={Marks} path="/marks" />} />
      <Route path="/assignments" component={() => <ProtectedRoute component={Assignments} path="/assignments" />} />
      <Route path="/library" component={() => <ProtectedRoute component={Library} path="/library" />} />
      <Route path="/fees" component={() => <ProtectedRoute component={Fees} path="/fees" />} />
      <Route path="/notices" component={() => <ProtectedRoute component={Notices} path="/notices" />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} path="/settings" />} />
      
      <Route>
        <Shell>
          <NotFound />
        </Shell>
      </Route>
    </Switch>
  );
}

function App() {
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
