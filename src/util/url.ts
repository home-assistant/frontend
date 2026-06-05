export function obfuscateUrl(url: string) {
  if (url.endsWith(".ui.nabu.casa")) {
    return "https://•••••••••••••••••.ui.nabu.casa";
  }
  // hide any words that look like they might be a hostname or IP address
  return url.replace(/(:\/\/|\.)([\w-]+)/g, (_m, prefix, word) =>
    prefix + "•".repeat(word.length)
  );
}
