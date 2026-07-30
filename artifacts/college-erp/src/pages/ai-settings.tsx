import { useState, useEffect } from "react";
import { Save, Server, Key, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useGetAiSettings, useUpdateAiSettings } from "@workspace/api-client-react";

export default function AiSettings() {
  const { toast } = useToast();
  
  const [error, setError] = useState<string | null>(null);
  const settingsQuery = useGetAiSettings();
  const updateSettings = useUpdateAiSettings();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    if (settingsQuery.data) {
      setProvider(settingsQuery.data.provider);
      setModel(settingsQuery.data.model);
      setSystemPrompt(settingsQuery.data.systemPrompt);
    }
  }, [settingsQuery.data]);

  const handleSave = async () => {
    setError(null);
    try {
      await updateSettings.mutateAsync({
        data: { provider, model, systemPrompt, isEnabled: false },
      });
      toast({
        title: "Settings saved",
        description: "AI provider configuration has been updated successfully.",
      });
    } catch {
      setError("Failed to save settings. Please try again.");
      toast({
        title: "Error saving settings",
        variant: "destructive",
      });
    }
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Settings</h2>
        <p className="mt-1 text-muted-foreground">
          Configure the AI providers and system prompts for your institution.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Provider Configuration
          </CardTitle>
          <CardDescription>
            Select the LLM provider and specify the model to use for the AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google Gemini</SelectItem>
                <SelectItem value="local">Local (Ollama/vLLM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Default Model</Label>
            <Input 
              id="model" 
              value={model} 
              onChange={e => setModel(e.target.value)}
              placeholder="e.g., gpt-4o, claude-3-5-sonnet"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <Input 
              id="apiKey" 
              type="password"
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)}
              placeholder="Leave blank to keep existing key"
            />
            <p className="text-xs text-muted-foreground">
              API keys are stored securely and never exposed back to the client.
            </p>
          </div>
          
          <div className="space-y-2 border-t pt-6 mt-6">
            <Label htmlFor="systemPrompt">Global System Prompt Base</Label>
            <textarea 
              id="systemPrompt" 
              value={systemPrompt} 
              onChange={e => setSystemPrompt(e.target.value)}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="You are a helpful assistant..."
            />
            <p className="text-xs text-muted-foreground">
              This base prompt will be combined with role-specific instructions automatically.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-muted/50 py-4 px-6">
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
