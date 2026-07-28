import { useState } from "react";
import { 
  useListSemesters, 
  useCreateSemester,
  useUpdateSemester,
  useDeleteSemester
} from "@workspace/api-client-react";
import { Plus, CalendarDays, MoreHorizontal, FileEdit, Trash2, Power } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListSemestersQueryKey } from "@workspace/api-client-react";

export default function Semesters() {
  const { data: semesters, isLoading } = useListSemesters();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useDeleteSemester();
  const updateMutation = useUpdateSemester();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this semester?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Semester deleted" });
        queryClient.invalidateQueries({ queryKey: getListSemestersQueryKey() });
      } catch (err: any) {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, data: { isActive: !currentStatus } });
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: getListSemestersQueryKey() });
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Semesters</h2>
          <p className="text-muted-foreground mt-1">Manage academic terms and their timelines</p>
        </div>
        <SemesterDialog mode="create" />
      </div>

      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Semester Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !semesters?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No semesters found
                </TableCell>
              </TableRow>
            ) : (
              semesters.map((semester) => {
                const start = new Date(semester.startDate);
                const end = new Date(semester.endDate);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const diffMonths = Math.round(diffDays / 30);

                return (
                  <TableRow key={semester.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        {semester.name}
                      </div>
                    </TableCell>
                    <TableCell>{format(start, "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(end, "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-muted-foreground">~{diffMonths} months</TableCell>
                    <TableCell>
                      <Badge variant={semester.isActive ? "default" : "secondary"} className={semester.isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none" : ""}>
                        {semester.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => toggleActive(semester.id, semester.isActive)} className="cursor-pointer">
                            <Power className="mr-2 h-4 w-4" /> Toggle Status
                          </DropdownMenuItem>
                          <SemesterDialog mode="edit" semester={semester} trigger={
                            <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                              <FileEdit className="mr-2 h-4 w-4" /> Edit
                            </div>
                          } />
                          <DropdownMenuItem onClick={() => handleDelete(semester.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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

const semesterSchema = z.object({
  name: z.string().min(1, "Name required"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  isActive: z.boolean().default(false)
});

function SemesterDialog({ mode, semester, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateSemester();
  const updateMutation = useUpdateSemester();

  const form = useForm({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      name: semester?.name || "",
      startDate: semester?.startDate ? format(new Date(semester.startDate), 'yyyy-MM-dd') : "",
      endDate: semester?.endDate ? format(new Date(semester.endDate), 'yyyy-MM-dd') : "",
      isActive: semester?.isActive || false
    }
  });

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data });
        toast({ title: "Semester created" });
      } else {
        await updateMutation.mutateAsync({ id: semester.id, data });
        toast({ title: "Semester updated" });
      }
      queryClient.invalidateQueries({ queryKey: getListSemestersQueryKey() });
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
            <Plus className="h-4 w-4" /> Add Semester
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Semester" : "Edit Semester"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({field}) => (
              <FormItem className="mt-4">
                <FormLabel>Semester Name</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Fall 2024" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({field}) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({field}) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="isActive" render={({field}) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-4">
                <div className="space-y-0.5">
                  <FormLabel>Set as Active</FormLabel>
                  <div className="text-[0.8rem] text-muted-foreground">
                    Only one semester should be active at a time usually.
                  </div>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{mode === "create" ? "Save" : "Update"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
