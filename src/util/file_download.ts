export const fileDownload = (href: string, filename = ""): void => {
  const element = document.createElement("a");
  element.target = "_blank";
  element.href = href;
  element.download = filename;
  element.style.display = "none";
  document.body.appendChild(element);
  element.dispatchEvent(new MouseEvent("click"));
  document.body.removeChild(element);

  if (href.startsWith("blob:")) {
    // Revoke blob URLs after a delay on Android so the WebView download
    // listener has time to fetch the blob before it becomes invalid.
    if (window.externalApp) {
      // 10 seconds gives the Android WebView download listener enough time
      // to open the blob before it is revoked, while still freeing memory
      // promptly. Revoking immediately would invalidate the URL before the
      // native layer can read it.
      const BLOB_REVOKE_DELAY_MS = 10_000;
      setTimeout(() => URL.revokeObjectURL(href), BLOB_REVOKE_DELAY_MS);
    } else {
      URL.revokeObjectURL(href);
    }
  }
};
