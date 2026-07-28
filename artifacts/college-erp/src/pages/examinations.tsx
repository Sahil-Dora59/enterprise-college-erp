import { useState } from "react";
import { 
  useListExaminations, 
  useListCourses,
  useListSemesters,
  useCreateExamination,
  useUpdateExamination,
  useDeleteExamination
} from "@workspace/api-client-react";
import { Plus, MoreHorizontal, FileEdit, Trash2, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListExaminationsQueryKey } from "@workspace/api-client-react";

export default function Examinations() {
  const [courseId, setCourseId] = useState<string>("all");
  const [semesterId, setSemesterId] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: courses } = useListCourses({});
  const { data: semesters } = useListSemesters();
  
  const queryParams = {
    ...(courseId !== "all" ? { courseId: Number(courseId) } : {}),
    ...(semesterId !== "all" ? { semesterId: Number(semesterId) } : {})
  };
  
  const { data: examinations, isLoading } = useListExaminations(queryParams, {
    query: { queryKey: getListExaminationsQueryKey(queryParams) }
  });

  const deleteMutation = useDeleteExamination();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this examination?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Examination deleted" });
        queryClient.invalidateQueries({ queryKey: [getListExaminationsQueryKey()[0]] });
      } catch (err: any) {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Examinations</h2>
          <p className="text-muted-foreground mt-1">Schedule and manage course examinations</p>
        </div>
        <ExamDialog mode="create" courses={courses || []} semesters={semesters || []} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={semesterId} onValueChange={setSemesterId}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Semester Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {semesters?.map(sem => (
              <SelectItem key={sem.id} value={sem.id.toString()}>{sem.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-[220px] bg-background">
            <SelectValue placeholder="Course Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses?.map(course => (
              <SelectItem key={course.id} value={course.id.toString()}>{course.code} - {course.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Exam Name</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Marks (Total/Pass)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[140px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !examinations?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No examinations found
                </TableCell>
              </TableRow>
            ) : (
              examinations.map((exam) => (
                <TableRow key={exam.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{exam.courseName}</span>
                      <span className="text-xs text-muted-foreground">{exam.semesterName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      exam.type === 'midterm' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                      exam.type === 'final' ? 'bg-primary/10 text-primary border-primary/20' :
                      'bg-purple-500/10 text-purple-600 border-purple-500/20'
                    }>
                      {exam.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        {format(new Date(exam.examDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        {exam.startTime} - {exam.endTime}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      {exam.venue || "TBD"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{exam.totalMarks}</span>
                    <span className="text-muted-foreground"> / {exam.passingMarks}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ExamDialog mode="edit" exam={exam} courses={courses || []} semesters={semesters || []} trigger={
                          <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                            <FileEdit className="mr-2 h-4 w-4" /> Edit
                          </div>
                        } />
                        <DropdownMenuItem onClick={() => handleDelete(exam.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

const examSchema = z.object({
  name: z.string().min(1, "Name required"),
  courseId: z.coerce.number().min(1, "Course required"),
  semesterId: z.coerce.number().min(1, "Semester required"),
  type: z.string().min(1, "Type required"),
  examDate: z.string().min(1, "Date required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalMarks: z.coerce.number().min(1),
  passingMarks: z.coerce.number().min(1),
  venue: z.string().optional()
});

function ExamDialog({ mode, exam, courses, semesters, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateExamination();
  const updateMutation = useUpdateExamination();

  const form = useForm({
    resolver: zodResolver(examSchema),
    defaultValues: {
      name: exam?.name || "",
      courseId: exam?.courseId || "",
      semesterId: exam?.semesterId || "",
      type: exam?.type || "midterm",
      examDate: exam?.examDate ? format(new Date(exam.examDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: exam?.startTime || "09:00",
      endTime: exam?.endTime || "12:00",
      totalMarks: exam?.totalMarks || 100,
      passingMarks: exam?.passingMarks || 40,
      venue: exam?.venue || ""
    }
  });

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data });
        toast({ title: "Examination scheduled" });
      } else {
        await updateMutation.mutateAsync({ id: exam.id, data });
        toast({ title: "Examination updated" });
      }
      queryClient.invalidateQueries({ queryKey: [getListExaminationsQueryKey()[0]] });
      setOpen(false);
      form.reset();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Schedule Exam
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Schedule Examination" : "Edit Examination"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({field}) => (
              <FormItem className="col-span-2 mt-4">
                <FormLabel>Exam Name</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Midterm Fall 2024" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="courseId" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Course</FormLabel>
                <Select onValueChange={field.onChange} value={field.value?.toString()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {courses?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.code} - {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="semesterId" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Semester</FormLabel>
                <Select onValueChange={field.onChange} value={field.value?.toString()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {semesters?.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="practical">Practical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="examDate" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="startTime" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Start Time</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="endTime" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>End Time</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="totalMarks" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Total Marks</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="passingMarks" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Passing Marks</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="venue" render={({field}) => (
              <FormItem className="col-span-2">
                <FormLabel>Venue / Room</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{mode === "create" ? "Schedule" : "Update"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
