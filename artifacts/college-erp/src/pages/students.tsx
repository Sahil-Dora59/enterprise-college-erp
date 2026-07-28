import { useState } from "react";
import { Link } from "wouter";
import { 
  useListStudents, 
  useListDepartments, 
  useListSemesters,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  Student
} from "@workspace/api-client-react";
import { Plus, Search, MoreHorizontal, FileEdit, Trash2, GraduationCap } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { getListStudentsQueryKey } from "@workspace/api-client-react";

export default function Students() {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [semesterId, setSemesterId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments } = useListDepartments();
  const { data: semesters } = useListSemesters();
  
  const queryParams = {
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(departmentId !== "all" ? { departmentId: Number(departmentId) } : {}),
    ...(semesterId !== "all" ? { semesterId: Number(semesterId) } : {})
  };
  
  const { data: studentsData, isLoading } = useListStudents(queryParams, {
    query: { queryKey: getListStudentsQueryKey(queryParams) }
  });

  const deleteMutation = useDeleteStudent();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this student?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Student deleted" });
        queryClient.invalidateQueries({ queryKey: [getListStudentsQueryKey()[0]] });
      } catch (err: any) {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Students</h2>
        <StudentDialog mode="create" departments={departments || []} semesters={semesters || []} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search students..." 
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
              <TableHead>Student</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !studentsData?.data.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              studentsData.data.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={student.avatarUrl || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {student.name?.substring(0, 2).toUpperCase() || <GraduationCap className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <Link href={`/students/${student.id}`} className="font-medium hover:text-primary transition-colors">
                          {student.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{student.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{student.rollNumber}</TableCell>
                  <TableCell>{student.departmentName}</TableCell>
                  <TableCell>{student.semesterName}</TableCell>
                  <TableCell>
                    <Badge variant={student.isActive ? "default" : "secondary"} className={student.isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none" : ""}>
                      {student.isActive ? "Active" : "Inactive"}
                    </Badge>
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
                        <Link href={`/students/${student.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            View Profile
                          </DropdownMenuItem>
                        </Link>
                        <StudentDialog mode="edit" student={student} departments={departments || []} semesters={semesters || []} trigger={
                          <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                            <FileEdit className="mr-2 h-4 w-4" /> Edit
                          </div>
                        } />
                        <DropdownMenuItem onClick={() => handleDelete(student.id)} className="text-destructive focus:text-destructive">
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
      
      {studentsData && studentsData.total > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div>Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, studentsData.total)} of {studentsData.total} entries</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 10 >= studentsData.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().optional(),
  rollNumber: z.string().min(1, "Roll number required"),
  departmentId: z.coerce.number().min(1),
  semesterId: z.coerce.number().min(1),
  admissionDate: z.string(),
  phone: z.string().optional(),
});

function StudentDialog({ mode, student, departments, semesters, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();

  const form = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: student?.name || "",
      email: student?.email || "",
      password: "",
      rollNumber: student?.rollNumber || "",
      departmentId: student?.departmentId || "",
      semesterId: student?.semesterId || "",
      admissionDate: student?.admissionDate ? format(new Date(student.admissionDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      phone: student?.phone || "",
    }
  });

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        if (!data.password) data.password = "temp123";
        await createMutation.mutateAsync({ data });
        toast({ title: "Student created" });
      } else {
        await updateMutation.mutateAsync({ id: student.id, data });
        toast({ title: "Student updated" });
      }
      queryClient.invalidateQueries({ queryKey: [getListStudentsQueryKey()[0]] });
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
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Student" : "Edit Student"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1 mt-4">
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {mode === "create" && (
              <FormField control={form.control} name="password" render={({field}) => (
                <FormItem className="col-span-2 sm:col-span-1">
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" {...field} placeholder="Auto-generated if empty" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="rollNumber" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Roll Number</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="departmentId" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
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
              <FormItem className="col-span-2 sm:col-span-1">
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
            <FormField control={form.control} name="admissionDate" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Admission Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="col-span-2 flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{mode === "create" ? "Save Student" : "Update Student"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
