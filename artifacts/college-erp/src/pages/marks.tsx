import { useState, useMemo } from "react";
import { 
  useListExaminations, 
  useListMarks,
  useEnterMark,
  useUpdateMark,
  useListStudents,
  getListStudentsQueryKey
} from "@workspace/api-client-react";
import { Search, Save, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListMarksQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Marks() {
  const [examId, setExamId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: examinations } = useListExaminations({});
  
  const selectedExam = useMemo(() => examinations?.find(e => e.id.toString() === examId), [examinations, examId]);

  // Load marks for the exam
  const { data: marksData, isLoading: isMarksLoading } = useListMarks(
    { examinationId: Number(examId) },
    { query: { enabled: !!examId, queryKey: getListMarksQueryKey({ examinationId: Number(examId) }) } }
  );

  // Load students for the course & semester to get the roster
  const { data: studentsData, isLoading: isStudentsLoading } = useListStudents(
    { semesterId: selectedExam?.semesterId, limit: 100 }, // ideally courseId as well but list students doesn't have it
    { query: { enabled: !!selectedExam, queryKey: getListStudentsQueryKey({ semesterId: selectedExam?.semesterId, limit: 100 }) } }
  );

  const enterMarkMutation = useEnterMark();
  const updateMarkMutation = useUpdateMark();

  const [localMarks, setLocalMarks] = useState<Record<number, { id?: number, marks: string }>>({});

  // Sync marks to local state
  useMemo(() => {
    if (marksData && studentsData) {
      const initial: Record<number, { id?: number, marks: string }> = {};
      studentsData.data.forEach((student: any) => {
        const existing = marksData.find((m: any) => m.studentId === student.id);
        if (existing) {
          initial[student.id] = { id: existing.id, marks: existing.marksObtained.toString() };
        } else {
          initial[student.id] = { marks: "" };
        }
      });
      setLocalMarks(initial);
    }
  }, [marksData, studentsData]);

  const handleMarkChange = (studentId: number, val: string) => {
    setLocalMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks: val }
    }));
  };

  const handleSave = async (studentId: number) => {
    const entry = localMarks[studentId];
    if (!entry.marks) return;

    try {
      if (entry.id) {
        await updateMarkMutation.mutateAsync({ 
          id: entry.id, 
          data: { marksObtained: Number(entry.marks) } 
        });
      } else {
        await enterMarkMutation.mutateAsync({
          data: {
            examinationId: Number(examId),
            studentId,
            marksObtained: Number(entry.marks)
          }
        });
      }
      toast({ title: "Marks saved" });
      queryClient.invalidateQueries({ queryKey: getListMarksQueryKey({ examinationId: Number(examId) }) });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    }
  };

  const getGrade = (marks: number, total: number) => {
    const percent = (marks / total) * 100;
    if (percent >= 90) return { grade: 'A+', color: 'text-emerald-500' };
    if (percent >= 80) return { grade: 'A', color: 'text-emerald-500' };
    if (percent >= 70) return { grade: 'B', color: 'text-blue-500' };
    if (percent >= 60) return { grade: 'C', color: 'text-amber-500' };
    if (percent >= 50) return { grade: 'D', color: 'text-orange-500' };
    return { grade: 'F', color: 'text-destructive' };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Examination Marks</h2>
          <p className="text-muted-foreground mt-1">Enter and manage student grades</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-[400px] space-y-1.5">
            <label className="text-sm font-medium">Select Examination</label>
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choose an exam" />
              </SelectTrigger>
              <SelectContent>
                {examinations?.map(exam => (
                  <SelectItem key={exam.id} value={exam.id.toString()}>
                    {exam.name} - {exam.courseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedExam && (
            <div className="flex items-center gap-4 text-sm mt-auto mb-2 border-l pl-4 border-border/50">
              <div><span className="text-muted-foreground">Total Marks:</span> <span className="font-bold">{selectedExam.totalMarks}</span></div>
              <div><span className="text-muted-foreground">Passing:</span> <span className="font-bold">{selectedExam.passingMarks}</span></div>
            </div>
          )}
        </CardContent>
      </Card>

      {examId ? (
        <div className="rounded-md border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead className="w-[150px]">Marks Obtained</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isStudentsLoading || isMarksLoading) ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[40px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !studentsData?.data.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No students found for this semester
                  </TableCell>
                </TableRow>
              ) : (
                studentsData.data.map((student) => {
                  const entry = localMarks[student.id];
                  const hasMarks = entry?.marks !== "" && entry?.marks !== undefined;
                  const marksNum = hasMarks ? Number(entry.marks) : 0;
                  const gradeInfo = hasMarks && selectedExam ? getGrade(marksNum, selectedExam.totalMarks) : null;
                  const isPassing = hasMarks && selectedExam && marksNum >= selectedExam.passingMarks;

                  return (
                    <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="font-mono text-xs">{student.rollNumber}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          max={selectedExam?.totalMarks}
                          min={0}
                          className="h-8 w-24 bg-background" 
                          value={entry?.marks || ""}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          onBlur={() => entry?.marks && entry.marks !== marksData?.find((m:any) => m.studentId === student.id)?.marksObtained.toString() && handleSave(student.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {gradeInfo ? (
                          <span className={`font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasMarks && selectedExam ? (
                          <Badge variant="outline" className={isPassing ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                            {isPassing ? 'PASS' : 'FAIL'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">PENDING</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 gap-1.5"
                          onClick={() => handleSave(student.id)}
                          disabled={!entry?.marks || entry.marks === marksData?.find((m:any) => m.studentId === student.id)?.marksObtained.toString()}
                        >
                          {entry?.id ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Save className="h-4 w-4" />}
                          {entry?.id ? "Saved" : "Save"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
          Please select an examination to enter marks.
        </div>
      )}
    </div>
  );
}
