import { useState, useRef, useEffect } from "react";
import { Bot, Send, Trash2, AlertCircle, Loader2 } from "lucide-react";
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Chat with {assistantName}</h2>
          <p className="text-muted-foreground mt-1">Ask questions, request summaries, or get assistance.</p>
        </div>
         <Button variant="outline" size="sm" onClick={clearChat} disabled={conversationId === null || isLoading}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Chat
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-muted">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0 relative">
          <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
            {messagesQuery.isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="max-w-sm">
                  <p className="font-medium text-foreground">No messages yet</p>
                  <p className="text-sm mt-1">
                    Send a message below to start a conversation with your intelligent assistant.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <ChatMessage
                    key={msg.id}
                    message={{
                      id: String(msg.id),
                      role: msg.role,
                      content: msg.content,
                      timestamp: msg.createdAt,
                    }}
                  />
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
