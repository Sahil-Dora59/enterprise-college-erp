import { useState } from "react";
import { 
  useListCourses, 
  useListDepartments, 
  useListSemesters,
  useListFaculty,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse
} from "@workspace/api-client-react";
import { Plus, Search, MoreHorizontal, FileEdit, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListCoursesQueryKey } from "@workspace/api-client-react";

export default function Courses() {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [semesterId, setSemesterId] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments } = useListDepartments();
  const { data: semesters } = useListSemesters();
  
  const queryParams = {
    ...(search ? { search } : {}),
    ...(departmentId !== "all" ? { departmentId: Number(departmentId) } : {}),
    ...(semesterId !== "all" ? { semesterId: Number(semesterId) } : {})
  };
  
  const { data: courses, isLoading } = useListCourses(queryParams, {
    query: { queryKey: getListCoursesQueryKey(queryParams) }
  });

  const deleteMutation = useDeleteCourse();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this course?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Course deleted" });
        queryClient.invalidateQueries({ queryKey: [getListCoursesQueryKey()[0]] });
      } catch (err: any) {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Courses</h2>
        <CourseDialog mode="create" departments={departments || []} semesters={semesters || []} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search courses..." 
            className="pl-9 bg-background" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map(dept => (
              <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={semesterId} onValueChange={setSemesterId}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {semesters?.map(sem => (
              <SelectItem key={sem.id} value={sem.id.toString()}>{sem.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Course Name</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Enrollment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[40px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !courses?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold">{course.code}</TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>{course.credits}</TableCell>
                  <TableCell>{course.departmentName}</TableCell>
                  <TableCell>{course.semesterName}</TableCell>
                  <TableCell>{course.facultyName || <span className="text-muted-foreground italic text-xs">Unassigned</span>}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {course.enrolledCount || 0} / {course.maxStudents || "∞"}
                    </div>
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
                        <CourseDialog mode="edit" course={course} departments={departments || []} semesters={semesters || []} trigger={
                          <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                            <FileEdit className="mr-2 h-4 w-4" /> Edit
                          </div>
                        } />
                        <DropdownMenuItem onClick={() => handleDelete(course.id)} className="text-destructive focus:text-destructive">
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

const courseSchema = z.object({
  name: z.string().min(1, "Name required"),
  code: z.string().min(1, "Code required"),
  credits: z.coerce.number().min(1),
  departmentId: z.coerce.number().min(1),
  semesterId: z.coerce.number().min(1),
  facultyId: z.coerce.number().optional().nullable(),
  maxStudents: z.coerce.number().optional().nullable(),
  description: z.string().optional()
});

function CourseDialog({ mode, course, departments, semesters, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();

  // Load faculty based on selected department (could be optimized)
  const { data: facultyData } = useListFaculty({ limit: 100 });

  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: course?.name || "",
      code: course?.code || "",
      credits: course?.credits || 3,
      departmentId: course?.departmentId || "",
      semesterId: course?.semesterId || "",
      facultyId: course?.facultyId || "",
      maxStudents: course?.maxStudents || 60,
      description: course?.description || ""
    }
  });

  const onSubmit = async (data: any) => {
    // Clean up empty optional fields
    if (!data.facultyId) delete data.facultyId;
    if (!data.maxStudents) delete data.maxStudents;

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data });
        toast({ title: "Course created" });
      } else {
        await updateMutation.mutateAsync({ id: course.id, data });
        toast({ title: "Course updated" });
      }
      queryClient.invalidateQueries({ queryKey: [getListCoursesQueryKey()[0]] });
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
            <Plus className="h-4 w-4" /> Add Course
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Course" : "Edit Course"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({field}) => (
              <FormItem className="col-span-2 mt-4">
                <FormLabel>Course Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="code" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Course Code</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. CS101" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="credits" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Credits</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="departmentId" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} value={field.value?.toString()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {departments?.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
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
            <FormField control={form.control} name="facultyId" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Assigned Faculty</FormLabel>
                <Select onValueChange={field.onChange} value={field.value?.toString()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {facultyData?.data.map((f: any) => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="maxStudents" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Max Students</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="col-span-2 flex justify-end gap-2 mt-4 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{mode === "create" ? "Save Course" : "Update Course"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
