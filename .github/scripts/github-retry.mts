// Retries GitHub API requests with jittered exponential backoff. Shared by the
// workflow scripts in this directory, test/e2e/post-report-comment.mjs and the
// fetch-nightly-translations gulp task. Only wrap requests that are safe to
// repeat: a create that fails after GitHub has applied it would run twice.
//
// This replaces @octokit/plugin-retry, which only retries HTTP error statuses
// on a fixed 1s, 4s, 9s delay with no jitter or logging. GitHub can also
// answer 200 with briefly stale data, such as the nightly translations lookup
// returning an old run with no artifact, and the plugin cannot retry that.
// github-script also leaves its built-in retries off by default.

const RETRIES = 3;

const BASE_DELAY = 1000; // ms

const MAX_DELAY = 10000; // ms

const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

// Throw from a request to retry a response GitHub may answer differently on
// the next attempt, such as briefly stale data
export class RetryableError extends Error {}

// Octokit reports network failures as status 500
const isRetryable = (err: unknown) => {
  if (err instanceof RetryableError) {
    return true;
  }

  if (!(err instanceof Error) || !("status" in err)) {
    return false;
  }

  const status = Number(err.status);

  return (
    TRANSIENT_STATUSES.has(status) ||
    (status === 403 && /rate limit/i.test(err.message))
  );
};

export async function withRetry<T>(
  label: string,
  request: () => Promise<T>
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await request();
    } catch (err) {
      if (attempt > RETRIES || !isRetryable(err)) {
        throw err;
      }

      const delay =
        Math.min(BASE_DELAY * 2 ** (attempt - 1), MAX_DELAY) *
        (0.8 + Math.random() * 0.4);

      // eslint-disable-next-line no-console
      console.log(
        `Retrying ${label} after ${(delay / 1000).toFixed(1)}s (attempt ${attempt}/${RETRIES}): ${err instanceof Error ? err.message : err}`
      );
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }
}
