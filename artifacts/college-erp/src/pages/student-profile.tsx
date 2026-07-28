import { useParams, Link } from "wouter";
import { 
  useGetStudent, 
  useGetStudentCourses,
  useGetAttendanceSummary,
  useListFees,
  getGetStudentQueryKey,
  getGetStudentCoursesQueryKey,
  getGetAttendanceSummaryQueryKey,
  getListFeesQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  User, Mail, Phone, MapPin, Calendar, BookOpen, 
  CheckCircle, AlertCircle, Clock, CreditCard, ChevronLeft
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentProfile() {
  const params = useParams();
  const id = Number(params.id);

  const { data: student, isLoading: isStudentLoading } = useGetStudent(id, {
    query: { enabled: !!id, queryKey: getGetStudentQueryKey(id) }
  });

  const { data: courses, isLoading: isCoursesLoading } = useGetStudentCourses(id, {
    query: { enabled: !!id, queryKey: getGetStudentCoursesQueryKey(id) }
  });

  const { data: attendance, isLoading: isAttendanceLoading } = useGetAttendanceSummary(
    { studentId: id },
    { query: { enabled: !!id, queryKey: getGetAttendanceSummaryQueryKey({ studentId: id }) } }
  );

  const { data: feesData, isLoading: isFeesLoading } = useListFees(
    { studentId: id },
    { query: { enabled: !!id, queryKey: getListFeesQueryKey({ studentId: id }) } }
  );

  if (isStudentLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><Skeleton className="h-8 w-64" /></div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!student) return <div>Student not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/students">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Student Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1 border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute h-32 w-full bg-primary/10 top-0 left-0"></div>
          <CardContent className="pt-16 flex flex-col items-center text-center relative z-10">
            <Avatar className="h-24 w-24 border-4 border-card mb-4 shadow-sm">
              <AvatarImage src={student.avatarUrl || ""} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {student.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold">{student.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{student.rollNumber}</p>
            <Badge variant={student.isActive ? "default" : "secondary"} className="mb-6">
              {student.isActive ? "Active Student" : "Inactive"}
            </Badge>

            <div className="w-full space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground justify-center md:justify-start">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{student.email}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground justify-center md:justify-start">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{student.phone || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground justify-center md:justify-start">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Joined {format(new Date(student.admissionDate), "MMM yyyy")}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground justify-center md:justify-start">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{student.address || "N/A"}</span>
              </div>
            </div>

            <div className="w-full border-t border-border mt-6 pt-6">
              <div className="grid grid-cols-2 gap-4 text-left text-sm">
                <div>
                  <p className="text-muted-foreground text-xs font-medium mb-1">Department</p>
                  <p className="font-semibold">{student.departmentName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium mb-1">Semester</p>
                  <p className="font-semibold">{student.semesterName}</p>
                </div>
                {student.guardianName && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Guardian</p>
                    <p className="font-semibold">{student.guardianName} ({student.guardianPhone})</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="academic" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-card border border-border/50 h-auto p-1">
              <TabsTrigger value="academic" className="py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Academic</TabsTrigger>
              <TabsTrigger value="attendance" className="py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Attendance</TabsTrigger>
              <TabsTrigger value="fees" className="py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Fees</TabsTrigger>
            </TabsList>
            
            <TabsContent value="academic" className="mt-4 space-y-4">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" /> Enrolled Courses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Course Name</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Faculty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isCoursesLoading ? (
                          <TableRow><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                        ) : courses?.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No courses enrolled</TableCell></TableRow>
                        ) : (
                          courses?.map((course: any) => (
                            <TableRow key={course.id}>
                              <TableCell className="font-medium text-xs bg-muted/30">{course.code}</TableCell>
                              <TableCell>{course.name}</TableCell>
                              <TableCell>{course.credits}</TableCell>
                              <TableCell>{course.facultyName || "Unassigned"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="mt-4 space-y-4">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-primary" /> Attendance Summary
                  </CardTitle>
                  <CardDescription>Current semester attendance per course</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {isAttendanceLoading ? (
                      <Skeleton className="h-40 w-full" />
                    ) : (attendance as any)?.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground border rounded-md border-dashed">No attendance records found</p>
                    ) : (
                      (attendance as any)?.map((record: any) => (
                        <div key={record.courseId} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{record.courseName}</span>
                            <span className="font-bold">{record.percentage.toFixed(1)}%</span>
                          </div>
                          <Progress 
                            value={record.percentage} 
                            className="h-2"
                            indicatorClassName={
                              record.percentage >= 75 ? "bg-emerald-500" : 
                              record.percentage >= 50 ? "bg-amber-500" : "bg-destructive"
                            }
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Total Classes: {record.totalClasses}</span>
                            <span>Present: {record.presentCount} | Absent: {record.absentCount}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fees" className="mt-4 space-y-4">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5 text-primary" /> Fee Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isFeesLoading ? (
                          <TableRow><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                        ) : feesData?.data.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No fee records found</TableCell></TableRow>
                        ) : (
                          feesData?.data.map((fee: any) => (
                            <TableRow key={fee.id}>
                              <TableCell className="font-medium">{fee.feeType.replace('_', ' ')}</TableCell>
                              <TableCell>${fee.amount}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  fee.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                  fee.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                  fee.status === 'partial' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                  'bg-destructive/10 text-destructive border-destructive/20'
                                }>
                                  {fee.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(fee.dueDate), 'MMM dd, yyyy')}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
