/**
 * Utility function that enables haptic feedback
 */

interface HapticPayload {
  hapticType: string;
}

declare global {
  interface Window {
    externalApp?: {
      handleHaptic(payload: string);
    };
    webkit?: {
      messageHandlers: {
        handleHaptic: {
          postMessage(payload: HapticPayload);
        };
      };
    };
  }
}

export function forwardHaptic(hapticType: string) {
  const payload = { hapticType };
  if (window.externalApp) {
    window.externalApp.handleHaptic(JSON.stringify(payload));
  } else if (window.webkit) {
    window.webkit!.messageHandlers.handleHaptic.postMessage(payload);
  }
}
