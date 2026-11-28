/** What the API's join answer says about the confirmation email. */
interface JoinEmailOutcome {
  emailSent?: boolean;
  /** Only a send that was tried and refused. */
  emailFailed?: boolean;
}

/**
 * The toast after someone is going. It warns only when an email was tried and
 * did not go out: local development sends none, and a second join sends none,
 * and neither is a problem to report.
 */
export function joinedMessage(outcome: JoinEmailOutcome | undefined): {
  tone: "success" | "warning";
  text: string;
} {
  if (outcome?.emailFailed) {
    return {
      tone: "warning",
      text: "You joined this event, but the confirmation email could not be sent.",
    };
  }
  return {
    tone: "success",
    text: outcome?.emailSent
      ? "You joined this event. Confirmation email sent."
      : "You joined this event.",
  };
}
