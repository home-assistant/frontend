export function obfuscateUrl(url: string) {
  if (url.includes(".ui.nabu.casa")) {
    return "https://•••••••••••••••••.ui.nabu.casa";
  }
  // hide any words that look like they might be a hostname or IP address
  return url.replace(/(?<=:\/\/)[\w-]+|(?<=\.)[\w-]+/g, (match) =>
    "•".repeat(match.length)
  );
}
