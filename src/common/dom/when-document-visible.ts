// Some WebViews become visible after thawing without dispatching visibilitychange,
// resume, or focus. Check visibility while waiting so reconnects cannot stay blocked.
export const whenDocumentVisible = (callback: () => void): (() => void) => {
  const check = () => {
    if (!document.hidden) {
      cancel();
      callback();
    }
  };
  const interval = window.setInterval(check, 1000);
  const cancel = () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", check);
    document.removeEventListener("resume", check);
    window.removeEventListener("focus", check);
  };
  document.addEventListener("visibilitychange", check);
  document.addEventListener("resume", check);
  window.addEventListener("focus", check);
  return cancel;
};
