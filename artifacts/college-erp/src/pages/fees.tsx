import { useState } from "react";
import { 
  useListFees,
  useGetFeeSummary,
  useListSemesters,
  useCreateFeeRecord,
  useUpdateFeeRecord,
  usePayFee
} from "@workspace/api-client-react";
import { Search, Plus, MoreHorizontal, FileEdit, CreditCard, Receipt, AlertCircle } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListFeesQueryKey, getGetFeeSummaryQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Fees() {
  const [semesterId, setSemesterId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const { user } = useAuth();
  
  const isStudent = user?.role === "student";

  const { data: semesters } = useListSemesters();

  const queryParams = {
    limit: 50,
    ...(semesterId !== "all" ? { semesterId: Number(semesterId) } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(isStudent ? { studentId: user?.id } : {}) // If student, they should only see their own (the API should enforce this, but just in case)
  };

  const { data: feesData, isLoading } = useListFees(queryParams, {
    query: { queryKey: getListFeesQueryKey(queryParams) }
  });

  const { data: summary, isLoading: isSummaryLoading } = useGetFeeSummary(
    { semesterId: semesterId !== "all" ? Number(semesterId) : undefined },
    { query: { queryKey: getGetFeeSummaryQueryKey({ semesterId: semesterId !== "all" ? Number(semesterId) : undefined }) } }
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fee Management</h2>
          <p className="text-muted-foreground mt-1">Track and process student payments</p>
        </div>
        {!isStudent && <FeeRecordDialog mode="create" semesters={semesters || []} />}
      </div>

      {!isStudent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Total Due</p>
              {isSummaryLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
                <h3 className="text-2xl font-bold">{formatCurrency(summary?.totalDue || 0)}</h3>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
              {isSummaryLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
                <h3 className="text-2xl font-bold text-emerald-500">{formatCurrency(summary?.totalCollected || 0)}</h3>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
              {isSummaryLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
                <h3 className="text-2xl font-bold text-amber-500">{formatCurrency(summary?.totalPending || 0)}</h3>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Total Overdue</p>
              {isSummaryLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
                <h3 className="text-2xl font-bold text-destructive">{formatCurrency(summary?.totalOverdue || 0)}</h3>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {!isStudent && <TableHead>Student</TableHead>}
              <TableHead>Fee Type</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {!isStudent && <TableCell><Skeleton className="h-10 w-[150px]" /></TableCell>}
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !feesData?.data.length ? (
              <TableRow>
                <TableCell colSpan={isStudent ? 6 : 7} className="text-center py-10 text-muted-foreground">
                  No fee records found
                </TableCell>
              </TableRow>
            ) : (
              feesData.data.map((fee) => {
                const isLate = fee.status !== 'paid' && isPast(new Date(fee.dueDate));
                const displayStatus = isLate ? 'overdue' : fee.status;
                
                return (
                  <TableRow key={fee.id} className="hover:bg-muted/50 transition-colors">
                    {!isStudent && (
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{fee.studentName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{fee.rollNumber}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="capitalize">{fee.feeType.replace('_', ' ')}</TableCell>
                    <TableCell>{fee.semesterName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{formatCurrency(fee.amount)}</span>
                        {(fee.paidAmount ?? 0) > 0 && <span className="text-xs text-emerald-600">Paid: {formatCurrency(fee.paidAmount!)}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className={`flex items-center gap-1.5 ${isLate ? 'text-destructive font-medium' : ''}`}>
                        {isLate && <AlertCircle className="h-3 w-3" />}
                        {format(new Date(fee.dueDate), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        displayStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        displayStatus === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        displayStatus === 'partial' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }>
                        {displayStatus.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {fee.status !== 'paid' ? (
                        <PaymentDialog fee={fee} trigger={
                          <Button size="sm" className="h-8 gap-1.5">
                            <CreditCard className="h-3 w-3" /> Pay Now
                          </Button>
                        } />
                      ) : (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5">
                          <Receipt className="h-3 w-3" /> Receipt
                        </Button>
                      )}
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

// Dialog for Admins to create fees
const feeSchema = z.object({
  studentId: z.coerce.number().min(1, "Student ID required"),
  semesterId: z.coerce.number().min(1, "Semester required"),
  feeType: z.string().min(1),
  amount: z.coerce.number().min(1),
  dueDate: z.string().min(1),
  remarks: z.string().optional()
});

function FeeRecordDialog({ mode, fee, semesters, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateFeeRecord();

  const form = useForm({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      studentId: fee?.studentId || "",
      semesterId: fee?.semesterId || "",
      feeType: fee?.feeType || "tuition",
      amount: fee?.amount || "",
      dueDate: fee?.dueDate ? format(new Date(fee.dueDate), 'yyyy-MM-dd') : "",
      remarks: fee?.remarks || ""
    }
  });

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data });
        toast({ title: "Fee record created" });
      }
      queryClient.invalidateQueries({ queryKey: [getListFeesQueryKey()[0]] });
      queryClient.invalidateQueries({ queryKey: [getGetFeeSummaryQueryKey()[0]] });
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
            <Plus className="h-4 w-4" /> Create Fee Record
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Fee Record</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="studentId" render={({field}) => (
              <FormItem>
                <FormLabel>Student System ID</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="semesterId" render={({field}) => (
              <FormItem>
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
            <FormField control={form.control} name="feeType" render={({field}) => (
              <FormItem>
                <FormLabel>Fee Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="tuition">Tuition Fee</SelectItem>
                    <SelectItem value="hostel">Hostel Fee</SelectItem>
                    <SelectItem value="transport">Transport Fee</SelectItem>
                    <SelectItem value="library">Library Fine</SelectItem>
                    <SelectItem value="exam">Examination Fee</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="amount" render={({field}) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({field}) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="remarks" render={({field}) => (
              <FormItem>
                <FormLabel>Remarks (Optional)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for paying fees
const paymentSchema = z.object({
  paidAmount: z.coerce.number().min(1),
  paidDate: z.string().min(1),
  transactionId: z.string().optional()
});

function PaymentDialog({ fee, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const payMutation = usePayFee();

  const balance = fee.amount - (fee.paidAmount || 0);

  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paidAmount: balance,
      paidDate: format(new Date(), "yyyy-MM-dd"),
      transactionId: ""
    }
  });

  const onSubmit = async (data: any) => {
    try {
      await payMutation.mutateAsync({ 
        id: fee.id,
        data 
      });
      toast({ title: "Payment processed successfully" });
      queryClient.invalidateQueries({ queryKey: [getListFeesQueryKey()[0]] });
      queryClient.invalidateQueries({ queryKey: [getGetFeeSummaryQueryKey()[0]] });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>
        <div className="bg-muted/50 p-3 rounded-md mb-4 text-sm flex justify-between items-center">
          <div>
            <p className="font-semibold">{fee.feeType.replace('_', ' ').toUpperCase()}</p>
            <p className="text-muted-foreground">{fee.semesterName}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Remaining Balance</p>
            <p className="font-bold text-lg text-primary">${balance}</p>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="paidAmount" render={({field}) => (
              <FormItem>
                <FormLabel>Payment Amount ($)</FormLabel>
                <FormControl><Input type="number" max={balance} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="paidDate" render={({field}) => (
              <FormItem>
                <FormLabel>Payment Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="transactionId" render={({field}) => (
              <FormItem>
                <FormLabel>Transaction ID (Optional)</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. TXN-987654" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Payment</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
