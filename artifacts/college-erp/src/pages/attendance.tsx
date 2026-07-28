import { useState, useMemo } from "react";
import { 
  useListCourses,
  useListStudents,
  useListAttendance,
  useGetAttendanceSummary,
  useListSemesters,
  useBulkMarkAttendance
  , getListStudentsQueryKey
} from "@workspace/api-client-react";
import { Calendar as CalendarIcon, Check, X, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListAttendanceQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Attendance() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground mt-1">Manage and track student attendance records</p>
        </div>
      </div>

      <Tabs defaultValue="mark" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 bg-card border border-border/50 h-auto p-1">
          <TabsTrigger value="mark" className="py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Mark Attendance</TabsTrigger>
          <TabsTrigger value="summary" className="py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Summary Report</TabsTrigger>
        </TabsList>
        <TabsContent value="mark" className="mt-6">
          <MarkAttendanceTab />
        </TabsContent>
        <TabsContent value="summary" className="mt-6">
          <AttendanceSummaryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MarkAttendanceTab() {
  const [courseId, setCourseId] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: courses } = useListCourses({});
  const selectedCourse = useMemo(() => courses?.find(c => c.id.toString() === courseId), [courses, courseId]);

  // To get students, we use the course's department and semester
  const { data: studentsData, isLoading: isStudentsLoading } = useListStudents(
    { departmentId: selectedCourse?.departmentId, semesterId: selectedCourse?.semesterId, limit: 100 },
    { query: { enabled: !!selectedCourse, queryKey: getListStudentsQueryKey({ departmentId: selectedCourse?.departmentId, semesterId: selectedCourse?.semesterId, limit: 100 }) } }
  );

  const { data: attendanceData, isLoading: isAttendanceLoading } = useListAttendance(
    { courseId: Number(courseId), date },
    { query: { enabled: !!courseId && !!date, queryKey: getListAttendanceQueryKey({ courseId: Number(courseId), date }) } }
  );

  const bulkMarkMutation = useBulkMarkAttendance();

  const [marks, setMarks] = useState<Record<number, string>>({});

  // Initialize marks from existing attendance data
  useMemo(() => {
    if (attendanceData && attendanceData.length > 0) {
      const newMarks: Record<number, string> = {};
      attendanceData.forEach((record: any) => {
        newMarks[record.studentId] = record.status;
      });
      setMarks(newMarks);
    } else if (studentsData?.data) {
      const newMarks: Record<number, string> = {};
      studentsData.data.forEach((s: any) => {
        newMarks[s.id] = 'present'; // Default
      });
      setMarks(newMarks);
    }
  }, [attendanceData, studentsData]);

  const handleMark = (studentId: number, status: string) => {
    setMarks(prev => ({ ...prev, [studentId]: status }));
  };

  const handleBulkSubmit = async () => {
    if (!courseId || !date) return;
    
    const records = Object.entries(marks).map(([studentId, status]) => ({
      studentId: Number(studentId),
      status
    }));

    try {
      await bulkMarkMutation.mutateAsync({
        data: {
          courseId: Number(courseId),
          date,
          records
        }
      });
      toast({ title: "Attendance saved successfully" });
      queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ courseId: Number(courseId), date }) });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          <div className="w-full sm:w-[300px] space-y-1.5">
            <label className="text-sm font-medium">Select Course</label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map(course => (
                  <SelectItem key={course.id} value={course.id.toString()}>{course.code} - {course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[200px] space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-9 bg-background" />
            </div>
          </div>
          {courseId && studentsData?.data.length ? (
            <Button onClick={handleBulkSubmit} className="w-full sm:w-auto" disabled={bulkMarkMutation.isPending}>
              Save Attendance
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {courseId ? (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isStudentsLoading || isAttendanceLoading) ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-[250px] mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !studentsData?.data.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    No students found in this course's department & semester
                  </TableCell>
                </TableRow>
              ) : (
                studentsData.data.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {student.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{student.rollNumber}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant={marks[student.id] === 'present' ? 'default' : 'outline'}
                          size="sm"
                          className={marks[student.id] === 'present' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                          onClick={() => handleMark(student.id, 'present')}
                        >
                          <Check className="h-4 w-4 mr-1" /> Present
                        </Button>
                        <Button
                          variant={marks[student.id] === 'absent' ? 'default' : 'outline'}
                          size="sm"
                          className={marks[student.id] === 'absent' ? 'bg-destructive hover:bg-destructive text-white' : ''}
                          onClick={() => handleMark(student.id, 'absent')}
                        >
                          <X className="h-4 w-4 mr-1" /> Absent
                        </Button>
                        <Button
                          variant={marks[student.id] === 'late' ? 'default' : 'outline'}
                          size="sm"
                          className={marks[student.id] === 'late' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
                          onClick={() => handleMark(student.id, 'late')}
                        >
                          <Clock className="h-4 w-4 mr-1" /> Late
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
          Please select a course to mark attendance.
        </div>
      )}
    </div>
  );
}

function AttendanceSummaryTab() {
  const [courseId, setCourseId] = useState<string>("all");
  const [semesterId, setSemesterId] = useState<string>("all");

  const { data: courses } = useListCourses({});
  const { data: semesters } = useListSemesters();

  const queryParams = {
    ...(courseId !== "all" ? { courseId: Number(courseId) } : {}),
    ...(semesterId !== "all" ? { semesterId: Number(semesterId) } : {})
  };

  const { data: summary, isLoading } = useGetAttendanceSummary(queryParams);

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-[250px] space-y-1.5">
            <label className="text-sm font-medium">Semester Filter</label>
            <Select value={semesterId} onValueChange={setSemesterId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters?.map(sem => (
                  <SelectItem key={sem.id} value={sem.id.toString()}>{sem.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[300px] space-y-1.5">
            <label className="text-sm font-medium">Course Filter</label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses?.map(course => (
                  <SelectItem key={course.id} value={course.id.toString()}>{course.code} - {course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-center">Total Classes</TableHead>
              <TableHead className="text-center">Present</TableHead>
              <TableHead className="text-center">Absent</TableHead>
              <TableHead className="text-right">Attendance %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[40px] mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[40px] mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[40px] mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !summary?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No attendance data found
                </TableCell>
              </TableRow>
            ) : (
              (summary as any).map((record: any, idx: number) => (
                <TableRow key={`${record.studentId}-${record.courseId}-${idx}`}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{record.studentName}</span>
                      <span className="text-xs font-mono text-muted-foreground">{record.rollNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>{record.courseName}</TableCell>
                  <TableCell className="text-center">{record.totalClasses}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-medium">{record.presentCount}</TableCell>
                  <TableCell className="text-center text-destructive font-medium">{record.absentCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${record.percentage >= 75 ? 'bg-emerald-500' : record.percentage >= 50 ? 'bg-amber-500' : 'bg-destructive'}`} 
                          style={{ width: `${record.percentage}%` }}
                        />
                      </div>
                      <span className={`font-bold text-sm ${record.percentage >= 75 ? 'text-emerald-600' : record.percentage >= 50 ? 'text-amber-600' : 'text-destructive'}`}>
                        {record.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
