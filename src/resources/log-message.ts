import "core-js/modules/web.url.can-parse";
import { fromError } from "stacktrace-js";
import { UAParser } from "ua-parser-js";

// URL paths to remove from filenames and max stack trace lines for brevity
const REMOVAL_PATHS =
  /^\/(?:home-assistant\/frontend\/[^/]+|unknown|\/{2}\.)\//;
const MAX_STACK_FRAMES = 10;

export const createLogMessage = async (
  error: unknown,
  intro?: string,
  messageFallback?: string,
  stackFallback?: string
) => {
  const lines: (string | undefined)[] = [];
  // Append the originating browser/OS to any intro for easier identification
  if (intro) {
    const parser = new UAParser();
    const {
      name: browserName = "unknown browser",
      version: browserVersion = "",
    } = parser.getBrowser();
    const { name: osName = "unknown OS", version: osVersion = "" } =
      parser.getOS();
    const browser = `${browserName} ${browserVersion}`.trim();
    const os = `${osName} ${osVersion}`.trim();
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
        // @ts-expect-error canParse not in DOM library yet
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
      for (const [i, subError] of error.errors.entries()) {
        const prependNote = `Part ${i + 1} of ${error.errors.length}:`;
        lines.push(`${prependNote} ${await createLogMessage(subError)}`);
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
