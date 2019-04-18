/**
 * Utility function that enables haptic feedback
 */

export function forwardHaptic(hapticType: string) {
  const payload = { hapticType };
  if (window.externalApp) {
    window.externalApp.handleHaptic(JSON.stringify(payload));
  } else if (window.webkit) {
    window.webkit!.messageHandlers.handleHaptic.postMessage(payload);
  }
}
