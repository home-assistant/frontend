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

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LIFECYCLE_MODE_FLAGS,
  acquireProcessRecord,
  isProcessRecordAlive,
  outputLog,
  processStartTime,
  readProcessRecord,
  releaseProcessRecord,
  runCli,
  spawnDetachedToLog,
  spawnForeground,
  terminateDetachedProcess,
  terminateProcess,
  waitFor,
  writeProcessRecord,
} from "./managed-process.mjs";
import {
  buildCacheDir,
  describeOutputOwner,
  workflowLockEnv,
  workflowLockFile,
} from "./output-lock.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const gulpBin = path.join(repoRoot, "node_modules", ".bin", "gulp");
const stateDir = path.join(buildCacheDir, "ha-build");
const logFile = path.join(stateDir, "build.log");
const lockFile = workflowLockFile;

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

const devCommand = (suite) => {
  switch (suite) {
    case "app-serve":
      return "dev:serve";
    case "demo":
      return "dev:demo";
    case "gallery":
      return "dev:gallery";
    case "e2e-app":
      return "test:e2e:app:dev";
    default:
      return "dev";
  }
};

const readBuild = () => readProcessRecord(lockFile);

const releaseBuild = (token) => releaseProcessRecord(lockFile, token);

const acquireBuild = (modern, foreground) => {
  const token = `${process.pid}-${Date.now()}-${Math.random()}`;
  const result = acquireProcessRecord(lockFile, {
    pid: process.pid,
    startTime: processStartTime(process.pid),
    processGroup: false,
    foreground,
    kind: "build",
    modern,
    starting: true,
    token,
  });
  return result.acquired ? { token } : { existing: result.existing };
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
  if (existing?.kind === "output") {
    process.stdout.write(
      `${describeOutputOwner(existing)} already owns the build and development workflow` +
        `${existing.pid ? ` (pid ${existing.pid})` : ""}.\n`
    );
    return;
  }
  if (existing?.kind === "dev") {
    const command = devCommand(existing.suite);
    process.stdout.write(
      `Dev server (${existing.suite}) already running` +
        `${existing.pid ? ` (pid ${existing.pid})` : ""}.\n` +
        `  Stop:   yarn ${command} --stop\n` +
        `  Status: yarn ${command} --status\n` +
        `  Logs:   yarn ${command} --logs\n`
    );
    return;
  }
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
      env: workflowLockEnv(lock.token),
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
    return 1;
  }
  let child;
  try {
    child = await spawnDetachedToLog({
      cmd: gulpBin,
      args: [taskFor(modern)],
      cwd: repoRoot,
      env: workflowLockEnv(lock.token),
      logFile,
    });
    updateBuild(lock.token, child, true);
    process.stdout.write(
      `Started ${modern ? "modern " : ""}frontend build (pid ${child.pid})\n` +
        hints()
    );
    return 0;
  } catch (err) {
    if (child) {
      await terminateDetachedProcess(child);
    }
    releaseBuild(lock.token);
    throw err;
  }
};

const runStatus = () => {
  const existing = readBuild();
  if (existing?.kind === "build" && isProcessRecordAlive(existing)) {
    process.stdout.write(
      `Frontend ${existing.modern ? "modern " : ""}build running (pid ${existing.pid}).\n`
    );
  } else {
    if (existing?.kind === "build") {
      releaseBuild(existing.token);
    }
    process.stdout.write("Frontend build not running.\n");
  }
  return 0;
};

const runStop = async () => {
  let existing = readBuild();
  if (existing?.kind !== "build") {
    process.stdout.write("Frontend build not running.\n");
    return 0;
  }
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
  if (
    !existing ||
    existing.kind !== "build" ||
    !isProcessRecordAlive(existing)
  ) {
    if (existing) releaseBuild(existing.token);
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
  if (args.modes.length > 1 || (args.follow && args.mode !== "logs")) {
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
