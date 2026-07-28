import { useState } from "react";
import { 
  useListBooks, 
  useListBorrows,
  useCreateBook,
  useUpdateBook,
  useDeleteBook,
  useBorrowBook,
  useReturnBook
} from "@workspace/api-client-react";
import { Search, Plus, MoreHorizontal, FileEdit, Trash2, Book, ArrowRightLeft, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { format, isPast } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListBooksQueryKey, getListBorrowsQueryKey } from "@workspace/api-client-react";

export default function Library() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Library Management</h2>
          <p className="text-muted-foreground mt-1">Manage books and track borrowing records</p>
        </div>
      </div>

      <Tabs defaultValue="books" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 bg-card border border-border/50 h-auto p-1">
          <TabsTrigger value="books" className="py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Books Catalog</TabsTrigger>
          <TabsTrigger value="borrows" className="py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Borrow Records</TabsTrigger>
        </TabsList>
        <TabsContent value="books" className="mt-6 space-y-4">
          <BooksTab />
        </TabsContent>
        <TabsContent value="borrows" className="mt-6 space-y-4">
          <BorrowsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BooksTab() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: booksData, isLoading } = useListBooks({ search, limit: 20 }, {
    query: { queryKey: getListBooksQueryKey({ search, limit: 20 }) }
  });

  const deleteMutation = useDeleteBook();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this book?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Book deleted" });
        queryClient.invalidateQueries({ queryKey: [getListBooksQueryKey()[0]] });
      } catch (err: any) {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by title, author, or ISBN..." 
            className="pl-9 bg-background" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <BookDialog mode="create" />
      </div>

      <div className="rounded-md border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Book Details</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !booksData?.data.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No books found
                </TableCell>
              </TableRow>
            ) : (
              booksData.data.map((book) => (
                <TableRow key={book.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded text-primary">
                        <Book className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{book.title}</span>
                        <span className="text-xs text-muted-foreground">{book.author || "Unknown Author"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{book.category || "-"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{book.isbn}</TableCell>
                  <TableCell>{book.location || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={book.availableCopies > 0 ? "default" : "destructive"} className={book.availableCopies > 0 ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}>
                      {book.availableCopies} / {book.totalCopies} Available
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
                        <BorrowDialog book={book} trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={book.availableCopies === 0} className="text-primary focus:text-primary cursor-pointer">
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Issue Book
                          </DropdownMenuItem>
                        } />
                        <BookDialog mode="edit" book={book} trigger={
                          <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                            <FileEdit className="mr-2 h-4 w-4" /> Edit
                          </div>
                        } />
                        <DropdownMenuItem onClick={() => handleDelete(book.id)} className="text-destructive focus:text-destructive">
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
    </>
  );
}

const bookSchema = z.object({
  title: z.string().min(1, "Title required"),
  author: z.string().optional(),
  isbn: z.string().min(1, "ISBN required"),
  category: z.string().optional(),
  publisher: z.string().optional(),
  publishedYear: z.coerce.number().optional().nullable(),
  totalCopies: z.coerce.number().min(1),
  location: z.string().optional()
});

function BookDialog({ mode, book, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateBook();
  const updateMutation = useUpdateBook();

  const form = useForm({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: book?.title || "",
      author: book?.author || "",
      isbn: book?.isbn || "",
      category: book?.category || "",
      publisher: book?.publisher || "",
      publishedYear: book?.publishedYear || new Date().getFullYear(),
      totalCopies: book?.totalCopies || 1,
      location: book?.location || ""
    }
  });

  const onSubmit = async (data: any) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data });
        toast({ title: "Book added to catalog" });
      } else {
        await updateMutation.mutateAsync({ id: book.id, data });
        toast({ title: "Book updated" });
      }
      queryClient.invalidateQueries({ queryKey: [getListBooksQueryKey()[0]] });
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
          <Button className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Add Book
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Book" : "Edit Book"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
            <FormField control={form.control} name="title" render={({field}) => (
              <FormItem className="col-span-2 mt-4">
                <FormLabel>Book Title</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="author" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Author</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="isbn" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>ISBN</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Category</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Computer Science" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="location" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Shelf Location</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Row A, Shelf 3" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="publisher" render={({field}) => (
              <FormItem className="col-span-1">
                <FormLabel>Publisher</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4 col-span-1">
              <FormField control={form.control} name="publishedYear" render={({field}) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="totalCopies" render={({field}) => (
                <FormItem>
                  <FormLabel>Total Copies</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{mode === "create" ? "Add Book" : "Update Book"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const borrowSchema = z.object({
  studentId: z.coerce.number().min(1, "Student ID required"),
  borrowDate: z.string().min(1),
  dueDate: z.string().min(1)
});

function BorrowDialog({ book, trigger }: any) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const borrowMutation = useBorrowBook();

  const form = useForm({
    resolver: zodResolver(borrowSchema),
    defaultValues: {
      studentId: "",
      borrowDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") // 14 days later
    }
  });

  const onSubmit = async (data: any) => {
    try {
      await borrowMutation.mutateAsync({ 
        data: {
          bookId: book.id,
          studentId: data.studentId,
          borrowDate: data.borrowDate,
          dueDate: data.dueDate
        } 
      });
      toast({ title: "Book issued successfully" });
      queryClient.invalidateQueries({ queryKey: [getListBooksQueryKey()[0]] });
      queryClient.invalidateQueries({ queryKey: [getListBorrowsQueryKey()[0]] });
      setOpen(false);
      form.reset();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Issue Book</DialogTitle>
        </DialogHeader>
        <div className="bg-muted/50 p-3 rounded-md mb-4 text-sm">
          <p className="font-semibold">{book.title}</p>
          <p className="text-muted-foreground">{book.isbn}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="studentId" render={({field}) => (
              <FormItem>
                <FormLabel>Student ID (System ID)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="borrowDate" render={({field}) => (
                <FormItem>
                  <FormLabel>Issue Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
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
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Issue Book</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function BorrowsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: borrowsData, isLoading } = useListBorrows({ limit: 50 }, {
    query: { queryKey: getListBorrowsQueryKey({ limit: 50 }) }
  });

  const returnMutation = useReturnBook();

  const handleReturn = async (id: number) => {
    try {
      await returnMutation.mutateAsync({ id });
      toast({ title: "Book marked as returned" });
      queryClient.invalidateQueries({ queryKey: [getListBooksQueryKey()[0]] });
      queryClient.invalidateQueries({ queryKey: [getListBorrowsQueryKey()[0]] });
    } catch (err: any) {
      toast({ title: "Failed to return", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-md border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Book Details</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-10 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : !borrowsData?.length ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                No borrowing records found
              </TableCell>
            </TableRow>
          ) : (
            borrowsData.map((record) => {
              const isOverdue = record.status === 'borrowed' && record.dueDate && isPast(new Date(record.dueDate));
              
              return (
                <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{record.bookTitle}</span>
                      <span className="text-xs text-muted-foreground font-mono">{record.bookIsbn}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{record.studentName}</span>
                      <span className="text-xs text-muted-foreground font-mono">{record.rollNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(record.borrowDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-xs">
                    {record.dueDate ? format(new Date(record.dueDate), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    {record.status === 'returned' ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Returned</Badge>
                    ) : isOverdue ? (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                        <AlertTriangle className="h-3 w-3" /> Overdue
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.status === 'borrowed' && (
                      <Button size="sm" variant="outline" onClick={() => handleReturn(record.id)} className="h-8 text-xs gap-1">
                        <ArrowLeftRight className="h-3 w-3" /> Return
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
  );
}
