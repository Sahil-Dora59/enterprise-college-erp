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

function normalizeMessage(message: string): string {
  return message.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(message: string, terms: string[]): boolean {
  return terms.some((term) => message.includes(term));
}

function requestedSubject(message: string, fallback: string): string {
  const cleaned = message
    .replace(/^(please\s+)?(generate|create|draft|write|prepare|make)\s+/i, "")
    .replace(/^(an?\s+)?(assignment description|classroom notice|official notice|announcement|student email|report)\s*(for|about|on|regarding|:)?\s*/i, "")
    .trim()
    .replace(/[?.!]+$/, "");
  return cleaned.length >= 3 && cleaned.length <= 120 ? cleaned : fallback;
}

function studentFallback(message: string): string {
  if (includesAny(message, ["attendance", "absent", "presence", "present percentage"])) {
    return [
      "I can help with attendance.",
      "",
      "For a current attendance check, open the Attendance module and review your subject-wise records. Your attendance percentage is calculated as:",
      "attended classes ÷ scheduled classes × 100",
      "",
      "If you are worried about a shortage, review the affected subjects, contact the relevant faculty member, and check the institution's attendance policy for approved leave or correction requests.",
    ].join("\n");
  }

  if (includesAny(message, ["timetable", "time table", "schedule", "class time", "lecture"])) {
    return [
      "I can help with your timetable.",
      "",
      "Open the Courses or academic schedule section to check your current classes. Review the day, period, room, and faculty name for each course, and check for notices when a class is rescheduled.",
      "",
      "For a specific answer, tell me the day, course, or semester you want to check.",
    ].join("\n");
  }

  if (includesAny(message, ["fee", "fees", "tuition", "payment", "due amount", "receipt"])) {
    return [
      "I can help with fees and payments.",
      "",
      "Use the Fees section to review charges, paid amounts, outstanding balances, due dates, and payment receipts. Keep the receipt or transaction reference after making a payment.",
      "",
      "If a payment is missing or the balance looks incorrect, contact the accounts office with your student ID and transaction details rather than submitting the payment again.",
    ].join("\n");
  }

  if (includesAny(message, ["result", "results", "marks", "grade", "grades", "exam", "transcript", "gpa"])) {
    return [
      "I can help you understand results and marks.",
      "",
      "Open the Examinations or Marks section to review published results by examination and course. A result may remain unavailable until the institution publishes it.",
      "",
      "For a disputed mark, note the course and assessment, then follow the institution's review or revaluation process with the relevant faculty member.",
    ].join("\n");
  }

  if (includesAny(message, ["assignment", "homework", "coursework", "submission", "deadline"])) {
    return [
      "I can help with assignments.",
      "",
      "Check the Assignments section for the course, instructions, deadline, submission status, and any faculty feedback. Submit before the deadline and verify that the status changes to submitted.",
      "",
      "If you cannot submit, capture the error and contact your faculty member or academic support before the deadline.",
    ].join("\n");
  }

  if (includesAny(message, ["notice", "notices", "announcement", "circular", "bulletin"])) {
    return [
      "I can help you find notices.",
      "",
      "Open the Notices section and filter for notices relevant to your student role. Pay attention to the publication date, priority, target audience, and any expiry date or attachment.",
      "",
      "For an important deadline, save the notice details and confirm the latest version with the administration office.",
    ].join("\n");
  }

  return [
    "I am your AI Student Assistant.",
    "",
    "I can help with attendance, timetables, fees, results, assignments, and notices. Ask a question such as:",
    "• How do I check my attendance?",
    "• Where can I find my timetable?",
    "• How do I review an outstanding fee?",
    "• Where are my published results?",
    "",
    "I am using the built-in assistant while an external AI provider is not configured.",
  ].join("\n");
}

function facultyFallback(message: string): string {
  if (includesAny(message, ["assignment description", "describe an assignment", "assignment brief", "assignment"])) {
    const subject = requestedSubject(message, "Course topic");
    return [
      `Assignment Description: ${subject}`,
      "",
      "Objective",
      `Students will demonstrate their understanding of ${subject} by applying the relevant concepts to a clear academic or practical problem.`,
      "",
      "Instructions",
      "1. Review the course material and define the problem or question.",
      "2. Explain the approach, supporting evidence, and assumptions.",
      "3. Submit an organized response with references where appropriate.",
      "",
      "Deliverables",
      "Submit one clearly labeled document including the student's name, course, approach, findings, and conclusion.",
      "",
      "Assessment criteria",
      "Accuracy and understanding (40%), application and reasoning (30%), clarity and organization (20%), and references or originality (10%).",
      "",
      "Adjust the objective, deliverables, deadline, and rubric to match your course policy before publishing.",
    ].join("\n");
  }

  if (includesAny(message, ["classroom notice", "class notice", "notice to students", "class announcement"])) {
    const subject = requestedSubject(message, "Upcoming class update");
    return [
      "CLASSROOM NOTICE",
      "",
      `Subject: ${subject}`,
      "Dear Students,",
      "",
      "Please note the following update for our class:",
      "[Add the date, time, room, activity, or required action here.]",
      "",
      "Please review the course materials and contact the course faculty member if you need clarification.",
      "",
      "Regards,",
      "[Faculty name]",
      "[Department / Course]",
    ].join("\n");
  }

  if (includesAny(message, ["student email", "email to students", "mail students", "email my students", "draft an email"])) {
    const subject = requestedSubject(message, "Course update");
    return [
      `Subject: ${subject}`,
      "",
      "Dear Students,",
      "",
      "I am writing to share an important update regarding our course.",
      "[Add the context, key details, deadline, and required action here.]",
      "",
      "Please review the information and reach out if you have questions. If a response is required, please reply by [date].",
      "",
      "Regards,",
      "[Faculty name]",
      "[Course / Department]",
    ].join("\n");
  }

  if (includesAny(message, ["faq", "frequently asked", "office hour", "grading", "attendance policy", "faculty help"])) {
    return [
      "Common faculty guidance:",
      "",
      "• Attendance: Record attendance promptly and follow the institution's correction and approved-leave process.",
      "• Assignments: Publish clear objectives, deliverables, deadlines, submission rules, and grading criteria.",
      "• Grading: Keep assessment evidence and apply the approved rubric consistently.",
      "• Student support: Use official notices or email for material updates and document important decisions.",
      "• Office hours: Publish a regular time and location or approved online channel for student questions.",
      "",
      "Tell me whether you need an assignment, notice, email, or a specific policy draft.",
    ].join("\n");
  }

  return [
    "I am your AI Faculty Assistant.",
    "",
    "I can generate assignment descriptions, classroom notices, student emails, and answer common faculty FAQs. Try:",
    "• Generate an assignment description for data structures.",
    "• Draft a classroom notice about a room change.",
    "• Write an email to students about the next deadline.",
    "",
    "These drafts are built-in starting points. Review institutional policy and course details before sending or publishing.",
  ].join("\n");
}

function adminFallback(message: string): string {
  if (includesAny(message, ["official notice", "formal notice", "institutional notice", "notice"])) {
    const subject = requestedSubject(message, "Administrative update");
    return [
      "OFFICIAL NOTICE",
      "",
      `Subject: ${subject}`,
      "Date: [DD Month YYYY]",
      "Reference: [Reference number, if applicable]",
      "",
      "This notice is issued to inform the concerned students, faculty, and staff that:",
      "[Add the approved policy, schedule, process, or operational update here.]",
      "",
      "Required action",
      "[State who must act, what they must do, and the deadline.]",
      "",
      "This notice is effective from [date] and should be followed by all concerned parties.",
      "",
      "By order of the administration,",
      "[Authorized name]",
      "[Title / Office]",
    ].join("\n");
  }

  if (includesAny(message, ["announcement", "campus update", "campus announcement", "general announcement"])) {
    const subject = requestedSubject(message, "Campus announcement");
    return [
      "CAMPUS ANNOUNCEMENT",
      "",
      `Subject: ${subject}`,
      "",
      "The administration is pleased to share the following update:",
      "[Add the announcement details, audience, date, location, and any required action here.]",
      "",
      "Please share this information with the relevant departments and refer questions to [contact office].",
      "",
      "Administration",
    ].join("\n");
  }

  if (includesAny(message, ["report", "summary", "statistics", "statistic", "overview", "generate a report"])) {
    const subject = requestedSubject(message, "Administrative activity");
    return [
      `ADMINISTRATIVE REPORT: ${subject}`,
      "",
      "Reporting period: [Start date] to [End date]",
      "Prepared by: [Name / Office]",
      "",
      "Executive summary",
      "[Summarize the main activity, outcome, or operational position in two or three sentences.]",
      "",
      "Key figures",
      "• Total records: [value]",
      "• Completed: [value]",
      "• Pending: [value]",
      "• Exceptions requiring attention: [value]",
      "",
      "Observations",
      "1. [Observation supported by the available ERP data.]",
      "2. [Trend, risk, or follow-up item.]",
      "",
      "Recommended actions",
      "• [Action] — Owner: [office] — Due: [date]",
      "",
      "This is a text report template. Replace placeholders with verified ERP figures before distribution.",
    ].join("\n");
  }

  if (includesAny(message, ["faq", "frequently asked", "administrative help", "admin help", "policy", "registration", "admission"])) {
    return [
      "Common administrative guidance:",
      "",
      "• Notices: Use a dated official notice for policy, schedule, or process changes.",
      "• Announcements: Use a campus announcement for general information that does not change a formal policy.",
      "• Records: Verify the relevant student, faculty, finance, or academic records before communicating an outcome.",
      "• Access: Grant administrative access through the existing role and permission process.",
      "• Escalation: Route unresolved academic, financial, or welfare matters to the responsible office and record the follow-up.",
      "",
      "Tell me whether you need an official notice, announcement, report, or a specific administrative FAQ.",
    ].join("\n");
  }

  return [
    "I am your AI Admin Assistant.",
    "",
    "I can generate official notices, campus announcements, simple text reports, and answer common administrative FAQs. Try:",
    "• Generate an official notice about registration dates.",
    "• Draft a campus announcement for an upcoming event.",
    "• Create a simple report summary for this month.",
    "",
    "Review all generated text against approved policy and verified ERP data before publishing.",
  ].join("\n");
}

function builtInFallbackResponse(role: string, message: string): string {
  switch (role) {
    case "student":
      return studentFallback(message);
    case "faculty":
      return facultyFallback(message);
    case "admin":
    case "super_admin":
      return adminFallback(message);
    default:
      return [
        "I am the built-in AI Assistant.",
        "",
        "Your current role does not have a configured role-specific assistant. Please contact an administrator if you need access to Student, Faculty, or Admin AI capabilities.",
      ].join("\n");
  }
}

/**
 * Provider-neutral AI boundary. External model integrations belong behind this
 * function and must never be coupled to route handlers or UI components.
 */
export async function generateAssistantResponse(input: AiGenerationInput): Promise<AiGenerationResult> {
  return {
    provider: "not_configured",
    model: null,
    content: builtInFallbackResponse(input.role, normalizeMessage(input.message)),
  };
}