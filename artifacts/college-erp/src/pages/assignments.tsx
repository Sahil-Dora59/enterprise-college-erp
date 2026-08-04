import { useState } from "react";
import { 
  useListAssignments, 
  useListCourses,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment
} from "@workspace/api-client-react";
import { Plus, MoreHorizontal, FileEdit, Trash2, Calendar as CalendarIcon, FileText } from "lucide-react";
import { format, isPast } from "date-fns";

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
import { getListAssignmentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Assignments() {
  const [courseId, setCourseId] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: courses } = useListCourses({});
  
  const queryParams = {
    ...(courseId !== "all" ? { courseId: Number(courseId) } : {})
  };
  
  const { data: assignments, isLoading } = useListAssignments(queryParams, {
    query: { queryKey: getListAssignmentsQueryKey(queryParams) }
  });

  const deleteMutation = useDeleteAssignment();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this assignment?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Assignment deleted" });
        queryClient.invalidateQueries({ queryKey: [getListAssignmentsQueryKey()[0]] });
      } catch (err: any) {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    }
  };

  const isFacultyOrAdmin = ["super_admin", "admin", "faculty"].includes(user?.role || "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assignments</h2>
          <p className="text-muted-foreground mt-1">Course assignments and submissions</p>
        </div>
        {isFacultyOrAdmin && (
          <AssignmentDialog mode="create" courses={courses || []} />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
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
              <TableHead>Title</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Total Marks</TableHead>
              <TableHead>Submissions</TableHead>
              {isFacultyOrAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[140px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  {isFacultyOrAdmin && <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                </TableRow>
              ))
            ) : !assignments?.length ? (
              <TableRow>
                <TableCell colSpan={isFacultyOrAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground">
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment) => {
                const isOverdue = isPast(new Date(assignment.dueDate));
                
                return (
                  <TableRow key={assignment.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <FileText className="h-4 w-4 text-primary" />
                        {assignment.title}
                      </div>
                    </TableCell>
                    <TableCell>{assignment.courseName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-normal ${isOverdue ? 'text-destructive border-destructive/20 bg-destructive/10' : ''}`}>
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {format(new Date(assignment.dueDate), 'MMM dd, yyyy HH:mm')}
                      </Badge>
                    </TableCell>
                    <TableCell>{assignment.totalMarks}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                        {assignment.submissionCount || 0}
                      </Badge>
                    </TableCell>
                    {isFacultyOrAdmin && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <AssignmentDialog mode="edit" assignment={assignment} courses={courses || []} trigger={
                              <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                                <FileEdit className="mr-2 h-4 w-4" /> Edit
                              </div>
                            } />
                            <DropdownMenuItem onClick={() => handleDelete(assignment.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const assignmentSchema = z.object({
  title: z.string().min(1, "Title required"),
  courseId: z.coerce.number().min(1, "Course required"),
  facultyId: z.coerce.number().min(1, "Faculty ID required").default(1),
  dueDate: z.string().min(1, "Due date required"),
  totalMarks: z.coerce.number().min(1),
  description: z.string().optional()
});

function AssignmentDialog({ mode, assignment, courses, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateAssignment();
  const updateMutation = useUpdateAssignment();
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: assignment?.title || "",
      courseId: assignment?.courseId || "",
      facultyId: assignment?.facultyId || user?.id || 1, // Fallback
      dueDate: assignment?.dueDate ? format(new Date(assignment.dueDate), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      totalMarks: assignment?.totalMarks || 100,
      description: assignment?.description || ""
    }
  });

  const onSubmit = async (data: any) => {
    try {
      // Add timezone 'Z' handling if needed
      data.dueDate = new Date(data.dueDate).toISOString();

      if (mode === "create") {
        await createMutation.mutateAsync({ data });
        toast({ title: "Assignment created" });
      } else {
        await updateMutation.mutateAsync({ id: assignment.id, data });
        toast({ title: "Assignment updated" });
      }
      queryClient.invalidateQueries({ queryKey: [getListAssignmentsQueryKey()[0]] });
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
            <Plus className="h-4 w-4" /> Create Assignment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Assignment" : "Edit Assignment"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({field}) => (
              <FormItem className="mt-4">
                <FormLabel>Title</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="courseId" render={({field}) => (
              <FormItem>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="dueDate" render={({field}) => (
                <FormItem>
                  <FormLabel>Due Date & Time</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="totalMarks" render={({field}) => (
                <FormItem>
                  <FormLabel>Total Marks</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({field}) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{mode === "create" ? "Create" : "Update"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
