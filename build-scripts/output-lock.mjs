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

const GENERATED_LOCK_TOKEN_ENV = "HA_GENERATED_OUTPUT_LOCK_TOKEN";
const OUTPUT_LOCK_TOKEN_ENV = "HA_OUTPUT_LOCK_TOKEN";

export const generatedOutputLockFile = path.join(
  repoRoot,
  "node_modules",
  ".cache",
  "ha-generated-output.lock"
);

export const outputLockFile = (suite) =>
  path.join(repoRoot, "node_modules", ".cache", `ha-${suite}-output.lock`);

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

  const release = async () => {
    if (!ownedToken) {
      return;
    }
    releaseProcessRecord(file, ownedToken);
    ownedToken = undefined;
    process.off("exit", release);
  };

  const acquire = async () => {
    const inheritedToken = process.env[inheritedTokenEnv];
    if (inheritedToken) {
      if (readProcessRecord(file)?.token !== inheritedToken) {
        throw Error(
          `${label} lock ownership was lost before ${target} started.`
        );
      }
      return;
    }

    const token = `${process.pid}-${Date.now()}-${Math.random()}`;
    const result = acquireProcessRecord(file, {
      pid: process.pid,
      startTime: processStartTime(process.pid),
      processGroup: false,
      kind,
      target,
      token,
    });
    if (!result.acquired) {
      const pid = result.existing?.pid;
      throw Error(
        `Cannot run ${target}: ${describeOutputOwner(result.existing)} ` +
          `already owns ${label}${pid ? ` (pid ${pid})` : ""}.`
      );
    }

    ownedToken = token;
    process.once("exit", release);
  };

  acquire.displayName = `lock-${label}:${target}`;
  release.displayName = `unlock-${label}:${target}`;

  return { acquire, release };
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
