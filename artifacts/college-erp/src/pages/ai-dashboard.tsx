import { Link } from "wouter";
import { MessageSquare, Settings2, Sparkles, History, FileText, ClipboardList, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useListAiConversations } from "@workspace/api-client-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{assistantName}</h2>
        <p className="mt-1 text-muted-foreground">
          Your intelligent assistant for campus resources and operations.
        </p>
      </div>

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
