import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acquireProcessRecord,
  processStartTime,
  readProcessRecord,
  releaseProcessRecord,
} from "./managed-process.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
export const buildCacheDir =
  process.env.HA_BUILD_CACHE_DIR ??
  path.join(repoRoot, "node_modules", ".cache");

const WORKFLOW_LOCK_TOKEN_ENV = "HA_WORKFLOW_LOCK_TOKEN";
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

export const workflowLockFile = path.join(buildCacheDir, "ha-workflow.lock");

export const workflowLockEnv = (token) => ({
  ...process.env,
  [WORKFLOW_LOCK_TOKEN_ENV]: token,
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

const createLockTask = ({ file, inheritedTokenEnv, kind, label, target }) => {
  let exitToken;

  const cleanup = () => {
    if (!exitToken) {
      return;
    }
    releaseProcessRecord(file, exitToken);
    exitToken = undefined;
    process.off("exit", cleanup);
    unregisterSignalCleanup(cleanup);
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
    const result = acquireProcessRecord(file, record);
    if (!result.acquired) {
      const pid = result.existing?.pid;
      throw Error(
        `Cannot run ${target}: ${describeOutputOwner(result.existing)} ` +
          `already owns ${label}${pid ? ` (pid ${pid})` : ""}.`
      );
    }

    exitToken = token;
    process.once("exit", cleanup);
    registerSignalCleanup(cleanup);
  };

  acquire.displayName = `lock-${label}:${target}`;
  return acquire;
};

export const createWorkflowLockTask = (target) =>
  createLockTask({
    file: workflowLockFile,
    inheritedTokenEnv: WORKFLOW_LOCK_TOKEN_ENV,
    kind: "output",
    label: "build and development workflow",
    target,
  });

export const createOutputWorkflow = (targets) =>
  Object.fromEntries(
    Object.entries(targets).map(([key, target]) => [
      key,
      {
        task: target,
        acquire: createWorkflowLockTask(target),
      },
    ])
  );
