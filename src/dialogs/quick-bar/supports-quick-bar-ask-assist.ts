export const supportsQuickBarAskAssist = (
  conversationLoaded: boolean,
  hasNativeAssist: boolean,
  hasNativeAssistPrompt: boolean
): boolean => conversationLoaded && (!hasNativeAssist || hasNativeAssistPrompt);
