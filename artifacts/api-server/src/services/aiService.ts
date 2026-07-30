export type AiAssistantRole = "student" | "faculty" | "admin" | "super_admin" | "accountant" | "librarian";

export function getAiAssistantName(role: string): string {
  switch (role) {
    case "student":
      return "AI Student Assistant";
    case "faculty":
      return "AI Faculty Assistant";
    case "admin":
    case "super_admin":
      return "AI Admin Assistant";
    default:
      return "AI Assistant";
  }
}

export interface AiGenerationInput {
  role: string;
  message: string;
}

export interface AiGenerationResult {
  content: string;
  provider: "not_configured";
  model: null;
}

/**
 * Provider-neutral AI boundary. External model integrations belong behind this
 * function and must never be coupled to route handlers or UI components.
 */
export async function generateAssistantResponse(input: AiGenerationInput): Promise<AiGenerationResult> {
  const assistantName = getAiAssistantName(input.role);
  return {
    provider: "not_configured",
    model: null,
    content: `${assistantName} is ready to help, but no external AI provider is configured yet. Your message has been saved in this conversation for a future provider integration.`,
  };
}