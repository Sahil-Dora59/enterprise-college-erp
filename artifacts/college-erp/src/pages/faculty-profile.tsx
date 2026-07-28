import { useParams, Link } from "wouter";
import { 
  useGetFaculty, 
  useGetFacultyCourses,
  getGetFacultyQueryKey,
  getGetFacultyCoursesQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  Mail, Phone, Calendar, BookOpen, ChevronLeft, Award, BookText
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function FacultyProfile() {
  const params = useParams();
  const id = Number(params.id);

  const { data: faculty, isLoading: isFacultyLoading } = useGetFaculty(id, {
    query: { enabled: !!id, queryKey: getGetFacultyQueryKey(id) }
  });

  const { data: courses, isLoading: isCoursesLoading } = useGetFacultyCourses(id, {
    query: { enabled: !!id, queryKey: getGetFacultyCoursesQueryKey(id) }
  });

  if (isFacultyLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><Skeleton className="h-8 w-64" /></div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!faculty) return <div>Faculty member not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/faculty">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Faculty Profile</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 border-border/50 shadow-sm relative overflow-hidden h-fit">
          <div className="absolute h-32 w-full bg-primary/10 top-0 left-0"></div>
          <CardContent className="pt-16 flex flex-col items-center text-center relative z-10">
            <Avatar className="h-24 w-24 border-4 border-card mb-4 shadow-sm">
              <AvatarImage src={faculty.avatarUrl || ""} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {faculty.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold">{faculty.name}</h3>
            <p className="text-sm text-muted-foreground mb-1">{faculty.designation}</p>
            <p className="text-xs text-muted-foreground mb-4">Emp ID: {faculty.employeeId}</p>
            <Badge variant={faculty.isActive ? "default" : "secondary"} className="mb-6">
              {faculty.isActive ? "Active Faculty" : "Inactive"}
            </Badge>

            <div className="w-full space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{faculty.email}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{faculty.phone || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Joined {format(new Date(faculty.joiningDate), "MMM yyyy")}</span>
              </div>
            </div>

            <div className="w-full border-t border-border mt-6 pt-6">
              <div className="grid grid-cols-1 gap-4 text-left text-sm">
                <div>
                  <p className="text-muted-foreground text-xs font-medium mb-1 flex items-center gap-1">
                    <Award className="h-3 w-3" /> Qualification
                  </p>
                  <p className="font-semibold">{faculty.qualification || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium mb-1 flex items-center gap-1">
                    <BookText className="h-3 w-3" /> Specialization
                  </p>
                  <p className="font-semibold">{faculty.specialization || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium mb-1">Department</p>
                  <p className="font-semibold">{faculty.departmentName}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Courses */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" /> Assigned Courses
              </CardTitle>
              <CardDescription>Courses taught by this faculty member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Semester</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isCoursesLoading ? (
                      <TableRow><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    ) : courses?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No assigned courses</TableCell></TableRow>
                    ) : (
                      courses?.map((course: any) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium text-xs bg-muted/30">{course.code}</TableCell>
                          <TableCell>{course.name}</TableCell>
                          <TableCell>{course.credits}</TableCell>
                          <TableCell>{course.semesterName}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
