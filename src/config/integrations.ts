// External integrations. Each stays null until Phase 7, when Kevin supplies the values.
// The UI renders the chatbot widget and video links only when a value is set.
export const integrations: {
  /** Full Chatbase chat-widget script tag (not the iframe). */
  chatbaseScript: string | null;
  /** Chatbase help-page URL for the Regulatory Assistant. */
  chatbaseHelpUrl: string | null;
  /** HeyGen avatar video URL. */
  avatarVideoUrl: string | null;
} = {
  chatbaseScript: null,
  chatbaseHelpUrl: null,
  avatarVideoUrl: null,
};
