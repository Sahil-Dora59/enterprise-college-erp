import { Link } from "wouter";
import { MessageSquare, Settings2, Sparkles, History, FileText, ClipboardList, HelpCircle, Search, Star, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useListAiConversations } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function getAssistantName(role?: string) {
  switch (role) {
    case 'student': return 'AI Student Assistant';
    case 'faculty': return 'AI Faculty Assistant';
    case 'admin':
    case 'super_admin': return 'AI Admin Assistant';
    default: return 'AI Assistant';
  }
}

export default function AiDashboard() {
  const { user, hasPermission } = useAuth();
  const assistantName = getAssistantName(user?.role);
  const canManageSettings = hasPermission("ai.manage");
  const conversationsQuery = useListAiConversations();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const authHeaders = { Authorization: `Bearer ${localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token")}` };
  useEffect(() => {
    Promise.all([
      fetch("/api/ai/prompts", { headers: authHeaders }).then((r) => r.ok ? r.json() : []),
      fetch("/api/ai/documents", { headers: authHeaders }).then((r) => r.ok ? r.json() : []),
    ]).then(([loadedPrompts, loadedDocuments]) => { setPrompts(loadedPrompts); setDocuments(loadedDocuments); });
  }, []);
  const search = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) { setResults([]); return; }
    const response = await fetch(`/api/ai/search?q=${encodeURIComponent(value)}`, { headers: authHeaders });
    if (response.ok) setResults(await response.json());
  };
  const savePrompt = async () => {
    if (!promptTitle.trim() || !promptText.trim()) return;
    const response = await fetch("/api/ai/prompts", { method: "POST", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ title: promptTitle, prompt: promptText }) });
    if (response.ok) { setPrompts([await response.json(), ...prompts]); setPromptTitle(""); setPromptText(""); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{assistantName}</h2>
        <p className="mt-1 text-muted-foreground">
          Your intelligent assistant for campus resources and operations.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" />AI Search</CardTitle><CardDescription>Search your AI conversations, prompt library, and indexed documents.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Input value={query} onChange={(event) => void search(event.target.value)} placeholder="Search AI knowledge..." />
          {results.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{results.map((result) => <div key={`${result.type}-${result.id}`} className="rounded-md border p-2 text-sm"><Badge variant="outline">{result.type}</Badge><span className="ml-2">{result.name || result.title}</span></div>)}</div>}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              New Conversation
            </CardTitle>
            <CardDescription>Start a new chat with your AI assistant.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              Ask questions about schedules, policies, academic records, or general campus information.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full gap-2">
              <Link href="/ai/chat">
                <Sparkles className="h-4 w-4" />
                Start Chat
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Chats
            </CardTitle>
            <CardDescription>Continue a previous conversation.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex flex-col gap-2">
                {conversationsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading conversation history...</div>
                ) : conversationsQuery.data?.length ? (
                  conversationsQuery.data.slice(0, 3).map((conversation) => (
                    <Link key={conversation.id} href={`/ai/chat?conversation=${conversation.id}`} className="rounded-md border p-2 text-sm hover:bg-muted">
                      <span className="block font-medium">{conversation.title}</span>
                      <span className="text-xs text-muted-foreground">{new Date(conversation.updatedAt).toLocaleString()}</span>
                    </Link>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground italic">No recent conversations found.</div>
                )}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/ai/chat">
                View History
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {canManageSettings && (
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                AI Configuration
              </CardTitle>
              <CardDescription>Manage AI providers and models.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                Configure API keys and system instructions for the foundational AI models.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="secondary" className="w-full gap-2">
                <Link href="/ai/settings">
                  <Settings2 className="h-4 w-4" />
                  Manage Settings
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-primary" />Prompt Library</CardTitle><CardDescription>Save reusable prompts for notices, reports, assignments, and study notes.</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={promptTitle} onChange={(event) => setPromptTitle(event.target.value)} placeholder="Prompt title" /><Input value={promptText} onChange={(event) => setPromptText(event.target.value)} placeholder="Prompt template" /><Button onClick={() => void savePrompt()} disabled={!promptTitle.trim() || !promptText.trim()}>Save prompt</Button><div className="space-y-2">{prompts.slice(0, 4).map((prompt) => <div key={prompt.id} className="rounded-md border p-2 text-sm"><span className="font-medium">{prompt.title}</span><span className="ml-2 text-muted-foreground">{prompt.category}</span></div>)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />Document AI index</CardTitle><CardDescription>PDF-ready document metadata and extracted keyword architecture.</CardDescription></CardHeader><CardContent><div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" />{documents.length} indexed documents</div><p className="text-sm text-muted-foreground">Upload and OCR processing can attach extracted text to this index without changing the AI provider boundary.</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Utilities</CardTitle>
          <CardDescription>Start a focused built-in utility without leaving the existing AI chat.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Notice Generator", icon: FileText, prompt: "Create a professional college notice about " },
            { label: "Assignment Generator", icon: ClipboardList, prompt: "Generate an assignment with subject: , difficulty: Moderate, questions: 5, learning objectives: " },
            { label: "FAQ Assistant", icon: HelpCircle, prompt: "What are the common university FAQs about " },
          ].map(({ label, icon: Icon, prompt }) => (
            <Button key={label} asChild variant="outline" className="justify-start gap-2">
              <Link href={`/ai/chat?prompt=${encodeURIComponent(prompt)}`}><Icon className="h-4 w-4" />{label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
