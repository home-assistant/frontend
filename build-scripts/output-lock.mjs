import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acquireProcessRecord,
  processStartTime,
  readProcessRecord,
  releaseProcessRecord,
  sleep,
} from "./managed-process.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
export const buildCacheDir =
  process.env.HA_BUILD_CACHE_DIR ??
  path.join(repoRoot, "node_modules", ".cache");

const GENERATED_LOCK_TOKEN_ENV = "HA_GENERATED_OUTPUT_LOCK_TOKEN";
const OUTPUT_LOCK_TOKEN_ENV = "HA_OUTPUT_LOCK_TOKEN";
const generatedLockTimeoutSeconds = Number(
  process.env.HA_GENERATED_OUTPUT_LOCK_TIMEOUT || "120"
);
const GENERATED_LOCK_TIMEOUT_MS =
  Number.isFinite(generatedLockTimeoutSeconds) &&
  generatedLockTimeoutSeconds > 0
    ? generatedLockTimeoutSeconds * 1000
    : 120_000;
const signalCleanups = new Set();
const cleanupSignals = ["SIGINT", "SIGTERM", "SIGHUP"];

const handleSignal = (signal) => {
  for (const cleanup of signalCleanups) {
    cleanup();
  }
  for (const cleanupSignal of cleanupSignals) {
    process.off(cleanupSignal, handleSignal);
  }
  process.kill(process.pid, signal);
};

const registerSignalCleanup = (cleanup) => {
  if (signalCleanups.size === 0) {
    for (const signal of cleanupSignals) {
      process.on(signal, handleSignal);
    }
  }
  signalCleanups.add(cleanup);
};

const unregisterSignalCleanup = (cleanup) => {
  signalCleanups.delete(cleanup);
  if (signalCleanups.size === 0) {
    for (const signal of cleanupSignals) {
      process.off(signal, handleSignal);
    }
  }
};

const acquireUntil = async (file, record, deadline) => {
  const result = acquireProcessRecord(file, record);
  if (result.acquired || Date.now() >= deadline) {
    return result;
  }
  await sleep(100);
  return acquireUntil(file, record, deadline);
};

export const generatedOutputLockFile = path.join(
  buildCacheDir,
  "ha-generated-output.lock"
);

export const outputLockFile = (suite) =>
  path.join(buildCacheDir, `ha-${suite}-output.lock`);

export const generatedOutputLockEnv = (token) => ({
  ...process.env,
  [GENERATED_LOCK_TOKEN_ENV]: token,
});

export const outputLockEnv = (token) => ({
  ...process.env,
  [OUTPUT_LOCK_TOKEN_ENV]: token,
});

export const describeOutputOwner = (owner) => {
  if (owner?.kind === "build") {
    return `frontend ${owner.modern ? "modern " : ""}build`;
  }
  if (owner?.kind === "dev") {
    return `dev server (${owner.suite ?? "app"})`;
  }
  return owner?.target ? `Gulp task ${owner.target}` : "another process";
};

const createLockTasks = ({ file, inheritedTokenEnv, kind, label, target }) => {
  let ownedToken;
  let exitToken;

  const cleanup = () => {
    if (!exitToken) {
      return;
    }
    releaseProcessRecord(file, exitToken);
    ownedToken = undefined;
    exitToken = undefined;
    process.off("exit", cleanup);
    unregisterSignalCleanup(cleanup);
  };
  const release = async () => {
    if (!ownedToken) {
      return;
    }
    cleanup();
  };

  const acquire = async () => {
    const inheritedToken = process.env[inheritedTokenEnv];
    if (inheritedToken) {
      if (readProcessRecord(file)?.token !== inheritedToken) {
        throw Error(
          `${label} lock ownership was lost before ${target} started.`
        );
      }
      exitToken = inheritedToken;
      process.once("exit", cleanup);
      registerSignalCleanup(cleanup);
      return;
    }

    const token = `${process.pid}-${Date.now()}-${Math.random()}`;
    const record = {
      pid: process.pid,
      startTime: processStartTime(process.pid),
      processGroup: false,
      kind,
      target,
      token,
    };
    let result = acquireProcessRecord(file, record);
    if (!result.acquired && kind === "generated-output") {
      const deadline = Date.now() + GENERATED_LOCK_TIMEOUT_MS;
      process.stdout.write(
        `Waiting for ${describeOutputOwner(result.existing)} to release ${label}.\n`
      );
      result = await acquireUntil(file, record, deadline);
    }
    if (!result.acquired) {
      const pid = result.existing?.pid;
      throw Error(
        `Cannot run ${target}: ${describeOutputOwner(result.existing)} ` +
          `already owns ${label}${pid ? ` (pid ${pid})` : ""}.`
      );
    }

    ownedToken = token;
    exitToken = token;
    process.once("exit", cleanup);
    registerSignalCleanup(cleanup);
  };

  acquire.displayName = `lock-${label}:${target}`;
  release.displayName = `unlock-${label}:${target}`;

  return { acquire, release };
};

export const runWithLock = async (lock, task) => {
  await lock.acquire();
  try {
    await new Promise((resolve, reject) => {
      task((err) => (err ? reject(err) : resolve()));
    });
  } finally {
    lock.release();
  }
};

export const createOutputLockTasks = (suite, target) =>
  createLockTasks({
    file: outputLockFile(suite),
    inheritedTokenEnv: OUTPUT_LOCK_TOKEN_ENV,
    kind: "output",
    label: `${suite}-output`,
    target,
  });

export const createGeneratedLockTasks = (target) =>
  createLockTasks({
    file: generatedOutputLockFile,
    inheritedTokenEnv: GENERATED_LOCK_TOKEN_ENV,
    kind: "generated-output",
    label: "generated-output",
    target,
  });

export const createOutputWorkflow = (suite, targets) =>
  Object.fromEntries(
    Object.entries(targets).map(([key, target]) => [
      key,
      {
        task: target,
        output: createOutputLockTasks(suite, target),
        generated: createGeneratedLockTasks(target),
      },
    ])
  );
