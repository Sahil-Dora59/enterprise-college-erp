import { useEffect, useState } from "react";
import { Link } from "wouter";
import { 
  useListFaculty, 
  useListDepartments, 
  useCreateFaculty,
  useUpdateFaculty,
   useDeleteFaculty
} from "@workspace/api-client-react";
import { Plus, Search, MoreHorizontal, FileEdit, Trash2, GraduationCap, Briefcase, Users, UserCheck, BookOpen, Building2 } from "lucide-react";
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
import { getListFacultyQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export default function Faculty() {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments } = useListDepartments();
  
  const queryParams = {
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(departmentId !== "all" ? { departmentId: Number(departmentId) } : {})
  };
  
  const { data: facultyData, isLoading } = useListFaculty(queryParams, {
    query: { queryKey: getListFacultyQueryKey(queryParams) }
  });
  const [summary, setSummary] = useState<{ totalFaculty: number; activeFaculty: number; totalCourses: number; totalDepartments: number } | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
    fetch("/api/faculty/dashboard/summary", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const deleteMutation = useDeleteFaculty();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this faculty member?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Faculty deleted" });
        queryClient.invalidateQueries({ queryKey: [getListFacultyQueryKey()[0]] });
      } catch (err: any) {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Total faculty", summary?.totalFaculty, Users],
          ["Active faculty", summary?.activeFaculty, UserCheck],
          ["Assigned courses", summary?.totalCourses, BookOpen],
          ["Departments", summary?.totalDepartments, Building2],
        ] as [string, number | undefined, LucideIcon][]).map(([label, value, Icon]) => (
          <Card key={label as string}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label as string}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value ?? "—"}</div>
              <p className="text-xs text-muted-foreground">Live ERP records</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Faculty Directory</h2>
        <FacultyDialog mode="create" departments={departments || []} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search faculty..." 
            className="pl-9 bg-background" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map(dept => (
              <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Faculty Member</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
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
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !facultyData?.data.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No faculty found
                </TableCell>
              </TableRow>
            ) : (
              facultyData.data.map((faculty) => (
                <TableRow key={faculty.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={faculty.avatarUrl || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {faculty.name?.substring(0, 2).toUpperCase() || <Briefcase className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <Link href={`/faculty/${faculty.id}`} className="font-medium hover:text-primary transition-colors">
                          {faculty.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{faculty.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{faculty.employeeId}</TableCell>
                  <TableCell>{faculty.departmentName}</TableCell>
                  <TableCell>{faculty.designation}</TableCell>
                  <TableCell>
                    <Badge variant={faculty.isActive ? "default" : "secondary"} className={faculty.isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none" : ""}>
                      {faculty.isActive ? "Active" : "Inactive"}
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
                        <Link href={`/faculty/${faculty.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            View Profile
                          </DropdownMenuItem>
                        </Link>
                        <FacultyDialog mode="edit" faculty={faculty} departments={departments || []} trigger={
                          <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                            <FileEdit className="mr-2 h-4 w-4" /> Edit
                          </div>
                        } />
                        <DropdownMenuItem onClick={() => handleDelete(faculty.id)} className="text-destructive focus:text-destructive">
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
      
      {facultyData && facultyData.total > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div>Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, facultyData.total)} of {facultyData.total} entries</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 10 >= facultyData.total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const facultySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().optional(),
  employeeId: z.string().min(1, "Employee ID required"),
  departmentId: z.coerce.number().min(1),
  designation: z.string().min(1),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  joiningDate: z.string(),
  phone: z.string().optional(),
});

function FacultyDialog({ mode, faculty, departments, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateFaculty();
  const updateMutation = useUpdateFaculty();

  const form = useForm({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      name: faculty?.name || "",
      email: faculty?.email || "",
      password: "",
      employeeId: faculty?.employeeId || "",
      departmentId: faculty?.departmentId || "",
      designation: faculty?.designation || "",
      qualification: faculty?.qualification || "",
      specialization: faculty?.specialization || "",
      joiningDate: faculty?.joiningDate ? format(new Date(faculty.joiningDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      phone: faculty?.phone || "",
    }
  });

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        if (!data.password) data.password = "temp123";
        await createMutation.mutateAsync({ data });
        toast({ title: "Faculty member created" });
      } else {
        await updateMutation.mutateAsync({ id: faculty.id, data });
        toast({ title: "Faculty member updated" });
      }
      queryClient.invalidateQueries({ queryKey: [getListFacultyQueryKey()[0]] });
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
            <Plus className="h-4 w-4" /> Add Faculty
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Faculty" : "Edit Faculty Member"}</DialogTitle>
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
            <FormField control={form.control} name="employeeId" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Employee ID</FormLabel>
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
            <FormField control={form.control} name="designation" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Designation</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Professor, Lecturer" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="qualification" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Qualification</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Ph.D., M.Sc." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="specialization" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Specialization</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="joiningDate" render={({field}) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Joining Date</FormLabel>
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
              <Button type="submit">{mode === "create" ? "Save Faculty" : "Update Faculty"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
