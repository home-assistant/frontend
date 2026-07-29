// Manage a Home Assistant frontend production build with an agent-friendly
// interface, matching build-scripts/dev-server.mjs.
//
//   node build-scripts/build-manager.mjs [--modern] [mode]
//
//   (no mode)          Run in the foreground.
//   --background       Start detached, print the pid, then exit and leave it
//                      running.
//   --status           Report whether a managed build is running.
//   --stop             Stop a managed build.
//   --logs [--follow]  Print (or follow) the background build log.
//
//   --modern           Build only the modern frontend_latest bundle.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LIFECYCLE_MODE_FLAGS,
  isProcessRecordAlive,
  outputLog,
  processStartTime,
  readProcessRecord,
  runCli,
  spawnDetachedToLog,
  spawnForeground,
  terminateProcess,
  waitFor,
  writeProcessRecord,
} from "./managed-process.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const gulpBin = path.join(repoRoot, "node_modules", ".bin", "gulp");
const stateDir = path.join(repoRoot, "node_modules", ".cache", "ha-build");
const logFile = path.join(stateDir, "build.log");
const lockDir = path.join(stateDir, "build.lock");
const lockFile = path.join(lockDir, "process.json");
const cleanupLockDir = path.join(stateDir, "cleanup.lock");

const usage = () => {
  process.stderr.write(
    "Usage: node build-scripts/build-manager.mjs [--modern] " +
      "[--background | --status | --stop | --logs [--follow]]\n"
  );
};

const parseArgs = (argv) => {
  const args = {
    mode: "foreground",
    modes: [],
    follow: false,
    modern: false,
    unknown: [],
  };
  for (const arg of argv) {
    if (LIFECYCLE_MODE_FLAGS.has(arg)) {
      args.mode = LIFECYCLE_MODE_FLAGS.get(arg);
      args.modes.push(arg);
    } else if (arg === "--modern") {
      args.modern = true;
    } else if (arg === "--follow") {
      args.follow = true;
    } else {
      args.unknown.push(arg);
    }
  }
  return args;
};

const hints = () =>
  "  Stop:   yarn build --stop\n" +
  "  Status: yarn build --status\n" +
  "  Logs:   yarn build --logs\n";

const readBuild = () => readProcessRecord(lockFile);

const releaseBuild = (token) => {
  try {
    fs.mkdirSync(cleanupLockDir);
  } catch {
    return;
  }
  try {
    if (readBuild()?.token === token) {
      fs.rmSync(lockDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(cleanupLockDir, { recursive: true, force: true });
  }
};

const removeStaleBuild = () => {
  try {
    fs.mkdirSync(cleanupLockDir);
  } catch {
    return false;
  }
  try {
    const existing = readBuild();
    if (existing && isProcessRecordAlive(existing)) {
      return false;
    }
    if (!existing && Date.now() - fs.statSync(lockDir).mtimeMs < 5000) {
      return false;
    }
    fs.rmSync(lockDir, { recursive: true, force: true });
    return true;
  } finally {
    fs.rmSync(cleanupLockDir, { recursive: true, force: true });
  }
};

const acquireBuild = (modern, foreground) => {
  fs.mkdirSync(stateDir, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.mkdirSync(lockDir);
      const token = `${process.pid}-${Date.now()}-${Math.random()}`;
      writeProcessRecord(lockFile, {
        pid: process.pid,
        startTime: processStartTime(process.pid),
        processGroup: false,
        foreground,
        modern,
        starting: true,
        token,
      });
      return { token };
    } catch (err) {
      if (err.code !== "EEXIST") {
        throw err;
      }
      const existing = readBuild();
      if (existing && isProcessRecordAlive(existing)) {
        return { existing };
      }
      if (!removeStaleBuild()) {
        return { existing: readBuild() };
      }
    }
  }
  return { existing: readBuild() };
};

const updateBuild = (token, child, processGroup) => {
  const existing = readBuild();
  if (existing?.token !== token) {
    throw Error("Frontend build lock ownership was lost during startup.");
  }
  writeProcessRecord(lockFile, {
    ...existing,
    pid: child.pid,
    startTime: processStartTime(child.pid),
    processGroup,
    starting: false,
  });
};

const taskFor = (modern) => (modern ? "build-app-modern" : "build-app");

const reportExisting = (existing) => {
  process.stdout.write(
    `Frontend ${existing?.modern ? "modern " : ""}build already running` +
      `${existing?.pid ? ` (pid ${existing.pid})` : ""}.\n${hints()}`
  );
};

const runForeground = async (modern) => {
  const lock = acquireBuild(modern, true);
  if (!lock.token) {
    reportExisting(lock.existing);
    return 1;
  }
  try {
    return await spawnForeground({
      cmd: gulpBin,
      args: [taskFor(modern)],
      cwd: repoRoot,
      processGroup: true,
      onSpawn: (child) => updateBuild(lock.token, child, true),
    });
  } finally {
    releaseBuild(lock.token);
  }
};

const runBackground = async (modern) => {
  const lock = acquireBuild(modern, false);
  if (!lock.token) {
    reportExisting(lock.existing);
    return 0;
  }
  try {
    const child = await spawnDetachedToLog({
      cmd: gulpBin,
      args: [taskFor(modern)],
      cwd: repoRoot,
      logFile,
    });
    updateBuild(lock.token, child, true);
    process.stdout.write(
      `Started ${modern ? "modern " : ""}frontend build (pid ${child.pid})\n` +
        hints()
    );
    return 0;
  } catch (err) {
    releaseBuild(lock.token);
    throw err;
  }
};

const runStatus = () => {
  const existing = readBuild();
  if (existing && isProcessRecordAlive(existing)) {
    process.stdout.write(
      `Frontend ${existing.modern ? "modern " : ""}build running (pid ${existing.pid}).\n`
    );
  } else {
    if (existing) {
      removeStaleBuild();
    }
    process.stdout.write("Frontend build not running.\n");
  }
  return 0;
};

const runStop = async () => {
  let existing = readBuild();
  if (existing?.starting) {
    const token = existing.token;
    await waitFor(
      () => {
        const current = readBuild();
        return !current?.starting || current.token !== token;
      },
      100,
      5000
    );
    existing = readBuild();
  }
  if (!existing || !isProcessRecordAlive(existing)) {
    if (existing) {
      removeStaleBuild();
    }
    process.stdout.write("Frontend build not running.\n");
    return 0;
  }
  if (
    !(await terminateProcess({
      pid: existing.pid,
      processGroup: existing.processGroup,
      isStopped: () => !isProcessRecordAlive(existing),
    }))
  ) {
    process.stderr.write(
      `Failed to stop frontend build (pid ${existing.pid}). Stop it manually.\n`
    );
    return 1;
  }
  releaseBuild(existing.token);
  process.stdout.write(`Stopped frontend build (pid ${existing.pid}).\n`);
  return 0;
};

const runLogs = (follow) =>
  outputLog(logFile, follow, `No frontend build log yet (${logFile}).\n`);

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.unknown.length) {
    process.stderr.write(`Unknown arguments: ${args.unknown.join(" ")}\n`);
    usage();
    return 1;
  }
  if (
    args.modes.length > 1 ||
    (args.follow && args.mode !== "logs") ||
    (args.modern && !["foreground", "background"].includes(args.mode))
  ) {
    process.stderr.write("Invalid combination of build arguments.\n");
    usage();
    return 1;
  }
  const handlers = {
    foreground: () => runForeground(args.modern),
    background: () => runBackground(args.modern),
    status: runStatus,
    stop: runStop,
    logs: () => runLogs(args.follow),
  };
  return handlers[args.mode]();
};

runCli(main);
