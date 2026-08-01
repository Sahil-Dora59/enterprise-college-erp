import { useState, useRef, useEffect } from "react";
import { Bot, Send, Trash2, AlertCircle, Loader2, Copy, Download, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateAiConversation,
  useDeleteAiConversation,
  getListAiMessagesQueryKey,
  useListAiConversations,
  useListAiMessages,
  useSendAiMessage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChatMessage, Message } from "@/components/ai/ChatMessage";
import { getAssistantName } from "@/pages/ai-dashboard";

export default function AiChat() {
  const { user } = useAuth();
  const assistantName = getAssistantName(user?.role);
  
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get("conversation");
    const parsed = value ? Number(value) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationsQuery = useListAiConversations();
  const createConversation = useCreateAiConversation();
  const sendMessage = useSendAiMessage();
  const deleteConversation = useDeleteAiConversation();
  const messagesQuery = useListAiMessages(conversationId ?? 0, {
    query: {
      queryKey: getListAiMessagesQueryKey(conversationId ?? 0),
      enabled: conversationId !== null,
    },
  });
  const messages = messagesQuery.data ?? [];
  const isLoading = createConversation.isPending || sendMessage.isPending;
  const initialPrompt = new URLSearchParams(window.location.search).get("prompt");

  useEffect(() => {
    if (initialPrompt && !input) setInput(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    const firstConversation = conversationsQuery.data?.[0];
    if (conversationId === null && firstConversation) {
      setConversationId(firstConversation.id);
    }
  }, [conversationId, conversationsQuery.data]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const ensureConversation = async () => {
    if (conversationId !== null) return conversationId;
    const conversation = await createConversation.mutateAsync({ data: { title: "New conversation" } });
    setConversationId(conversation.id);
    return conversation.id;
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput("");
    setError(null);

    try {
      const id = await ensureConversation();
      await sendMessage.mutateAsync({ id, data: { content } });
      await messagesQuery.refetch();
      await conversationsQuery.refetch();
    } catch {
      setError("Failed to send message. Please try again.");
    }
  };

  const clearChat = async () => {
    setError(null);
    if (conversationId === null) return;
    try {
      await deleteConversation.mutateAsync({ id: conversationId });
      setConversationId(null);
      await conversationsQuery.refetch();
    } catch {
      setError("Failed to clear this conversation. Please try again.");
    }
  };

  const copyResponse = async (id: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(id);
      window.setTimeout(() => setCopiedMessageId(null), 1600);
    } catch {
      setError("Copy is unavailable in this browser. Select the response text manually.");
    }
  };

  const exportConversation = () => {
    const text = messages.map((message) => `${message.role.toUpperCase()}\n${message.content}`).join("\n\n");
    if (!text) {
      setError("There are no messages to export yet.");
      return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${assistantName.toLowerCase().replace(/\s+/g, "-")}-conversation.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Chat with {assistantName}</h2>
          <p className="text-muted-foreground mt-1">Ask questions, generate drafts, or get assistance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportConversation} disabled={!messages.length || isLoading}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={clearChat} disabled={conversationId === null || isLoading}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-muted">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0 relative">
          <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
            {messagesQuery.isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm">Loading conversation...</span>
                </div>
              </div>
            ) : messagesQuery.isError ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p>We could not load this conversation.</p>
                <Button variant="outline" size="sm" onClick={() => messagesQuery.refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Try again
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="max-w-sm">
                  <p className="font-medium text-foreground">No messages yet</p>
                  <p className="text-sm mt-1">Ask a question or try a utility prompt below.</p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {["Create a college notice", "Generate an assignment", "What are common university FAQs?"].map((prompt) => (
                      <Button key={prompt} type="button" variant="outline" size="sm" onClick={() => setInput(prompt)}>
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id}>
                  <ChatMessage
                    message={{
                      id: String(msg.id),
                      role: msg.role,
                      content: msg.content,
                      timestamp: msg.createdAt,
                    }}
                  />
                  {msg.role === "assistant" && (
                    <div className="ml-16 mt-1">
                      <Button variant="ghost" size="sm" onClick={() => copyResponse(msg.id, msg.content)}>
                        <Copy className="h-3 w-3 mr-1" />
                        {copiedMessageId === msg.id ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Assistant is typing...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 bg-background border-t">
            {error && (
              <Alert variant="destructive" className="mb-4 py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
