// Task to download the latest Lokalise translations from the nightly workflow artifacts

import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { retry } from "@octokit/plugin-retry";
import { Octokit } from "@octokit/rest";
import { deleteAsync } from "del";
import { mkdir, readFile, writeFile } from "fs/promises";
import gulp from "gulp";
import jszip from "jszip";
import path from "path";
import process from "process";
import tar from "tar";

const MAX_AGE = 24; // hours
const OWNER = "home-assistant";
const REPO = "frontend";
const WORKFLOW_NAME = "nightly.yaml";
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
  let currentArtifact;
  try {
    currentArtifact = JSON.parse(await readFile(ARTIFACT_FILE, "utf-8"));
    const currentAge =
      (Date.now() - Date.parse(currentArtifact.created_at)) / 3600000;
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

  // To store file writing promises
  const createExtractDir = mkdir(EXTRACT_DIR, { recursive: true });
  const writings = [];

  // Authenticate to GitHub using GitHub action token if it exists,
  // otherwise look for a saved user token or generate a new one if none
  let tokenAuth;
  if (process.env.GITHUB_TOKEN) {
    tokenAuth = { token: process.env.GITHUB_TOKEN };
  } else {
    try {
      tokenAuth = JSON.parse(await readFile(TOKEN_FILE, "utf-8"));
    } catch {
      if (!allowTokenSetup) {
        console.log("No token found so  build wil continue with English only");
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
        createExtractDir.then(
          writeFile(TOKEN_FILE, JSON.stringify(tokenAuth, null, 2))
        )
      );
    }
  }

  // Authenticate with token and request workflow runs from GitHub
  console.log("Fetching new translations...");
  const octokit = new (Octokit.plugin(retry))({
    userAgent: "Fetch Nightly Translations",
    auth: tokenAuth.token,
  });

  const workflowRunsResponse = await octokit.rest.actions.listWorkflowRuns({
    owner: OWNER,
    repo: REPO,
    workflow_id: WORKFLOW_NAME,
    status: "success",
    event: "schedule",
    per_page: 1,
    exclude_pull_requests: true,
  });
  if (workflowRunsResponse.data.total_count === 0) {
    throw Error("No successful nightly workflow runs found");
  }
  const latestNightlyRun = workflowRunsResponse.data.workflow_runs[0];

  // Stop if current is already the latest, otherwise Find the translations artifact
  if (currentArtifact?.workflow_run.id === latestNightlyRun.id) {
    console.log("Stopping because current translations are still the latest");
    return;
  }
  const latestArtifact = (
    await octokit.actions.listWorkflowRunArtifacts({
      owner: OWNER,
      repo: REPO,
      run_id: latestNightlyRun.id,
    })
  ).data.artifacts.find((artifact) => artifact.name === ARTIFACT_NAME);
  if (!latestArtifact) {
    throw Error("Latest nightly workflow run has no translations artifact");
  }
  writings.push(
    createExtractDir.then(
      writeFile(ARTIFACT_FILE, JSON.stringify(latestArtifact, null, 2))
    )
  );

  // Remove the current translations
  const deleteCurrent = Promise.all(writings).then(
    deleteAsync([`${EXTRACT_DIR}/*`, `!${ARTIFACT_FILE}`, `!${TOKEN_FILE}`])
  );

  // Get the download URL and follow the redirect to download (stored as ArrayBuffer)
  const downloadResponse = await octokit.actions.downloadArtifact({
    owner: OWNER,
    repo: REPO,
    artifact_id: latestArtifact.id,
    archive_format: "zip",
  });
  if (downloadResponse.status !== 200) {
    throw Error("Failure downloading translations artifact");
  }

  // Artifact is a tarball, but GitHub adds it to a zip file
  console.log("Unpacking downloaded translations...");
  const zip = await jszip.loadAsync(downloadResponse.data);
  await deleteCurrent;
  const extractStream = zip.file(/.*/)[0].nodeStream().pipe(tar.extract());
  await new Promise((resolve, reject) => {
    extractStream.on("close", resolve).on("error", reject);
  });
});

gulp.task(
  "setup-and-fetch-nightly-translations",
  gulp.series(
    "allow-setup-fetch-nightly-translations",
    "fetch-nightly-translations"
  )
);
