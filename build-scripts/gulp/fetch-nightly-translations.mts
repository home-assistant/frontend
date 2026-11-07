// Task to download the latest Lokalise translations from the nightly workflow artifacts

import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { Octokit } from "@octokit/rest";
import { deleteAsync } from "del";
import { mkdir, readFile, writeFile } from "fs/promises";
import gulp from "gulp";
import jszip from "jszip";
import path from "path";
import process from "process";
import { extract } from "tar";
import {
  RetryableError,
  withRetry,
} from "../../.github/scripts/github-retry.mts";

type Artifact = Awaited<
  ReturnType<Octokit["rest"]["actions"]["listArtifactsForRepo"]>
>["data"]["artifacts"][number];

const MAX_AGE = 24; // hours
const OWNER = "home-assistant";
const REPO = "frontend";

const BRANCH = "dev";
const ARTIFACT_NAME = "translations";
const CLIENT_ID = "Iv1.3914e28cb27834d1";
const EXTRACT_DIR = "translations";
const TOKEN_FILE = path.posix.join(EXTRACT_DIR, "token.json");
const ARTIFACT_FILE = path.posix.join(EXTRACT_DIR, "artifact.json");

let allowTokenSetup = false;
gulp.task("allow-setup-fetch-nightly-translations", (done) => {
  allowTokenSetup = true;
  done();
});

gulp.task("fetch-nightly-translations", async function () {
  // Skip all when environment flag is set (assumes translations are already in place)
  if (process.env?.SKIP_FETCH_NIGHTLY_TRANSLATIONS) {
    console.log("Skipping fetch due to environment signal");
    return;
  }

  // Read current translations artifact info if it exists,
  // and stop if they are not old enough
  let currentArtifact: Artifact | null;
  try {
    const artifact: Artifact = JSON.parse(
      await readFile(ARTIFACT_FILE, "utf-8")
    );

    currentArtifact = artifact;

    const currentAge =
      (Date.now() - Date.parse(artifact.created_at ?? "")) / 3600000;
    if (currentAge < MAX_AGE) {
      console.log(
        "Keeping current translations (only %s hours old)",
        currentAge.toFixed(1)
      );
      return;
    }
  } catch {
    currentArtifact = null;
  }

  try {
    await fetchTranslations(currentArtifact);
  } catch (err) {
    // Local builds should work offline or without valid GitHub credentials,
    // so fall back to English only. CI must fail instead of silently
    // building without translations.
    if (process.env.CI) {
      throw err;
    }
    console.warn(
      "Failed to fetch nightly translations, continuing with English only:",
      err instanceof Error ? err.message : err
    );
  }
});

async function fetchTranslations(currentArtifact: Artifact | null) {
  // To store file writing promises
  const createExtractDir = mkdir(EXTRACT_DIR, { recursive: true });
  const writings: Promise<void>[] = [];

  // Authenticate to GitHub using GitHub action token if it exists,
  // otherwise look for a saved user token or generate a new one if none
  let tokenAuth: { token: string };
  if (process.env.GITHUB_TOKEN) {
    tokenAuth = { token: process.env.GITHUB_TOKEN };
  } else {
    try {
      tokenAuth = JSON.parse(await readFile(TOKEN_FILE, "utf-8"));
    } catch {
      if (!allowTokenSetup) {
        console.log("No token found so build will continue with English only");
        return;
      }
      const auth = createOAuthDeviceAuth({
        clientType: "github-app",
        clientId: CLIENT_ID,
        onVerification: (verification) => {
          console.log(
            "Task needs to authenticate to GitHub to fetch the translations from nightly workflow\n" +
              "Please go to %s to authorize this task\n" +
              "\nEnter user code: %s\n\n" +
              "This code will expire in %s minutes\n" +
              "Task will automatically continue after authorization and token will be saved for future use",
            verification.verification_uri,
            verification.user_code,
            (verification.expires_in / 60).toFixed(0)
          );
        },
      });
      tokenAuth = await auth({ type: "oauth" });
      writings.push(
        createExtractDir.then(() =>
          writeFile(TOKEN_FILE, JSON.stringify(tokenAuth, null, 2))
        )
      );
    }
  }

  console.log("Fetching new translations...");

  // Authenticate with token and find the newest translations artifact
  const octokit = new Octokit({
    userAgent: "Fetch Nightly Translations",
    auth: tokenAuth.token,
  });

  // Only the nightly workflow uploads this artifact. Requiring a run from this
  // repository's own branch excludes artifacts uploaded by fork pull requests.
  const latestArtifact = await withRetry(
    "translations artifact lookup",
    async () => {
      const { data } = await octokit.rest.actions.listArtifactsForRepo({
        owner: OWNER,
        repo: REPO,
        name: ARTIFACT_NAME,
        per_page: 10,
      });

      const artifact = data.artifacts.find(
        ({ expired, workflow_run: run }) =>
          !expired &&
          run?.head_branch === BRANCH &&
          run.head_repository_id === run.repository_id
      );

      if (!artifact) {
        throw new RetryableError(
          `No ${ARTIFACT_NAME} artifact found from ${BRANCH}`
        );
      }

      return artifact;
    }
  );

  console.log(
    "Latest translations artifact is %s from workflow run %s (%s)",
    latestArtifact.id,
    latestArtifact.workflow_run?.id,
    latestArtifact.created_at
  );

  // Stop if current is already the latest
  if (currentArtifact?.id === latestArtifact.id) {
    console.log("Stopping because current translations are still the latest");
    return;
  }

  // Remove the current translations
  const deleteCurrent = Promise.all(writings).then(() =>
    deleteAsync([`${EXTRACT_DIR}/*`, `!${ARTIFACT_FILE}`, `!${TOKEN_FILE}`])
  );

  // Get the download URL and follow the redirect to download (stored as ArrayBuffer)
  const downloadResponse = await withRetry("translations download", () =>
    octokit.rest.actions.downloadArtifact({
      owner: OWNER,
      repo: REPO,
      artifact_id: latestArtifact.id,
      archive_format: "zip",
    })
  );

  // Octokit types the redirect, but fetch follows it to the archive
  if ((downloadResponse.status as number) !== 200) {
    throw Error("Failure downloading translations artifact");
  }

  // Artifact is a tarball, but GitHub adds it to a zip file
  console.log("Unpacking downloaded translations...");
  const zip = await jszip.loadAsync(downloadResponse.data as ArrayBuffer);
  await deleteCurrent;
  const extractStream = zip.file(/.*/)[0].nodeStream().pipe(extract());
  await new Promise((resolve, reject) => {
    extractStream.on("close", resolve).on("error", reject);
  });

  // Record the artifact only after successful extraction, so a failed fetch
  // is retried by the next build instead of being considered current.
  await createExtractDir;
  await writeFile(ARTIFACT_FILE, JSON.stringify(latestArtifact, null, 2));
}

gulp.task(
  "setup-and-fetch-nightly-translations",
  gulp.series(
    "allow-setup-fetch-nightly-translations",
    "fetch-nightly-translations"
  )
);
