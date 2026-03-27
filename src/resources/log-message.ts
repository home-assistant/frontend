import { fromError } from "stacktrace-js";

// URL paths to remove from filenames and max stack trace lines for brevity
const REMOVAL_PATHS =
  /^\/(?:home-assistant\/frontend\/[^/]+|unknown|\/{2}\.)\//;
const MAX_STACK_FRAMES = 10;

// Order matters: more specific UA tokens must come before generic ones
const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg\/(\S+)/, "Edge"],
  [/OPR\/(\S+)/, "Opera"],
  [/Chrome\/(\S+)/, "Chrome"],
  [/Firefox\/(\S+)/, "Firefox"],
  [/Version\/(\S+).*Safari/, "Safari"],
];

const OS_PATTERNS: [RegExp, string][] = [
  [/CrOS/, "Chrome OS"],
  [/Windows NT ([\d.]+)/, "Windows"],
  [/Android ([\d.]+)/, "Android"],
  [/iPhone OS ([\d_.]+)/, "iOS"],
  [/iPad; CPU OS ([\d_.]+)/, "iPadOS"],
  [/Mac OS X ([\d_.]+)/, "macOS"],
  [/Linux/, "Linux"],
];

const detectFromUA = (
  ua: string,
  patterns: [RegExp, string][],
  fallback: string
): string => {
  for (const [pattern, name] of patterns) {
    const match = ua.match(pattern);
    if (match) {
      const version = match[1]?.replace(/_/g, ".");
      return version ? `${name} ${version}` : name;
    }
  }
  return fallback;
};

export const createLogMessage = async (
  error: unknown,
  intro?: string,
  messageFallback?: string,
  stackFallback?: string
) => {
  const lines: (string | undefined)[] = [];
  // Append the originating browser/OS to any intro for easier identification
  if (intro) {
    const ua = navigator.userAgent;
    const browser = detectFromUA(ua, BROWSER_PATTERNS, "unknown browser");
    const os = detectFromUA(ua, OS_PATTERNS, "unknown OS");
    lines.push(`${intro} from ${browser} on ${os}`);
  }
  // In most cases, an Error instance will be thrown, which can have many details to log:
  // - a standard string coercion to "ErrorType: Message"
  // - a stack added by browsers (which must be converted to original source)
  // - an optional cause chain
  // - a possible list of aggregated errors
  if (error instanceof Error) {
    lines.push(error.toString() || messageFallback);
    const stackLines = (await fromError(error))
      .slice(0, MAX_STACK_FRAMES)
      .map((frame) => {
        frame.fileName ??= "";
        if (URL.canParse(frame.fileName)) {
          frame.fileName = new URL(frame.fileName).pathname;
        }
        frame.fileName = frame.fileName.replace(REMOVAL_PATHS, "");
        return frame.toString();
      });
    lines.push(...(stackLines.length > 0 ? stackLines : [stackFallback]));
    // @ts-expect-error Requires library bump to ES2022
    if (error.cause) {
      // @ts-expect-error Requires library bump to ES2022
      lines.push(`Caused by: ${await createLogMessage(error.cause)}`);
    }
    if (error instanceof AggregateError) {
      const subMessageEntries = error.errors.map(
        async (e, i) => [i, await createLogMessage(e)] as const
      );
      for await (const [i, m] of subMessageEntries) {
        lines.push(`Part ${i + 1} of ${error.errors.length}: ${m}`);
      }
    }
  } else {
    // The error could be anything, so just stringify it and log with fallbacks
    const errorString = JSON.stringify(error, null, 2);
    lines.push(
      messageFallback,
      errorString === messageFallback ? "" : errorString,
      stackFallback
    );
  }
  return lines.filter(Boolean).join("\n");
};
