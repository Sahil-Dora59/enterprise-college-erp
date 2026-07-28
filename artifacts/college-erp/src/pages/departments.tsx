import { useState } from "react";
import { 
  useListDepartments, 
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment
} from "@workspace/api-client-react";
import { Plus, Users, GraduationCap, Building2, MoreVertical, FileEdit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListDepartmentsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Departments() {
  const { data: departments, isLoading } = useListDepartments();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteDepartment();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this department?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Department deleted" });
        queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
      } catch (err: any) {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
          <p className="text-muted-foreground mt-1">Manage academic departments</p>
        </div>
        <DepartmentDialog mode="create" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))
        ) : departments?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No departments found. Create one to get started.</div>
        ) : (
          departments?.map((dept) => (
            <Card key={dept.id} className="border-border/50 hover:border-primary/50 transition-colors shadow-sm relative group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 text-primary rounded-md">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                    </div>
                    <CardDescription className="font-mono text-xs ml-8">{dept.code}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DepartmentDialog mode="edit" department={dept} trigger={
                        <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                          <FileEdit className="mr-2 h-4 w-4" /> Edit
                        </div>
                      } />
                      <DropdownMenuItem onClick={() => handleDelete(dept.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                  {dept.description || "No description provided."}
                </div>
                
                {dept.hodName && (
                  <div className="text-xs text-muted-foreground mb-4">
                    <span className="font-semibold text-foreground">HOD:</span> {dept.hodName}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{dept.studentCount || 0}</span>
                    <span className="text-muted-foreground text-xs">Students</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{dept.facultyCount || 0}</span>
                    <span className="text-muted-foreground text-xs">Faculty</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

const deptSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  hodName: z.string().optional()
});

function DepartmentDialog({ mode, department, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();

  const form = useForm({
    resolver: zodResolver(deptSchema),
    defaultValues: {
      name: department?.name || "",
      code: department?.code || "",
      description: department?.description || "",
      hodName: department?.hodName || ""
    }
  });

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data });
        toast({ title: "Department created" });
      } else {
        await updateMutation.mutateAsync({ id: department.id, data });
        toast({ title: "Department updated" });
      }
      queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
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
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Department" : "Edit Department"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({field}) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input {...field} placeholder="Computer Science" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="code" render={({field}) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl><Input {...field} placeholder="CSE" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="hodName" render={({field}) => (
              <FormItem>
                <FormLabel>Head of Department (Optional)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({field}) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{mode === "create" ? "Create" : "Update"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
