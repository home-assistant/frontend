// Manage a Home Assistant frontend production build with an agent-friendly
// interface, matching build-scripts/dev-server.mjs.
//
//   node build-scripts/build-manager.mjs [--modern] [mode]
//
//   (no mode)          Run in the foreground.
//   --background       Start detached, print the pid, then exit and leave it
//                      running.
//   --status           Report whether a background build is running.
//   --stop             Stop a running background build.
//   --logs [--follow]  Print (or follow) the background build log.
//
//   --modern           Build only the modern frontend_latest bundle.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const gulpBin = path.join(repoRoot, "node_modules", ".bin", "gulp");
const stateDir = path.join(repoRoot, "node_modules", ".cache", "ha-build");
const logFile = path.join(stateDir, "build.log");
const pidFile = path.join(stateDir, "build.pid");

const usage = () => {
  process.stderr.write(
    "Usage: node build-scripts/build-manager.mjs [--modern] " +
      "[--background | --status | --stop | --logs [--follow]]\n"
  );
};

const parseArgs = (argv) => {
  const args = {
    mode: "foreground",
    follow: false,
    modern: false,
    unknown: [],
  };
  for (const arg of argv) {
    switch (arg) {
      case "--modern":
        args.modern = true;
        break;
      case "--background":
        args.mode = "background";
        break;
      case "--status":
        args.mode = "status";
        break;
      case "--stop":
        args.mode = "stop";
        break;
      case "--logs":
        args.mode = "logs";
        break;
      case "--follow":
        args.follow = true;
        break;
      default:
        args.unknown.push(arg);
    }
  }
  return args;
};

const readPid = () => {
  try {
    const pid = Number(fs.readFileSync(pidFile, "utf8"));
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
};

const isAlive = (pid) => {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but is owned by someone else.
    return err.code === "EPERM";
  }
};

const removePid = () => {
  try {
    fs.rmSync(pidFile);
  } catch {
    // Already gone.
  }
};

// Signal the whole process group (the background build is its group leader),
// falling back to the bare pid if that is not permitted.
const killProcessTree = (pid, sig) => {
  try {
    process.kill(-pid, sig);
  } catch {
    try {
      process.kill(pid, sig);
    } catch {
      // Already gone.
    }
  }
};

const hints = () =>
  "  Stop:   yarn build --stop\n" +
  "  Status: yarn build --status\n" +
  "  Logs:   yarn build --logs\n";

const runningPid = () => {
  const pid = readPid();
  if (pid && isAlive(pid)) {
    return pid;
  }
  if (pid) {
    removePid();
  }
  return undefined;
};

const taskFor = (modern) => (modern ? "build-app-modern" : "build-app");

const runForeground = (modern) =>
  new Promise((resolve) => {
    const pid = runningPid();
    if (pid) {
      process.stderr.write(
        `Frontend build already running in the background (pid ${pid}). ` +
          "Stop it with yarn build --stop.\n"
      );
      resolve(1);
      return;
    }
    const child = spawn(gulpBin, [taskFor(modern)], {
      cwd: repoRoot,
      stdio: "inherit",
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });

const runBackground = (modern) => {
  const existing = runningPid();
  if (existing) {
    process.stdout.write(
      `Frontend build already running (pid ${existing}).\n${hints()}`
    );
    return 0;
  }
  fs.mkdirSync(stateDir, { recursive: true });
  const fd = fs.openSync(logFile, "w");
  const child = spawn(gulpBin, [taskFor(modern)], {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", fd, fd],
  });
  fs.closeSync(fd);
  fs.writeFileSync(pidFile, String(child.pid));
  child.unref();
  process.stdout.write(
    `Started ${modern ? "modern " : ""}frontend build (pid ${child.pid})\n` +
      hints()
  );
  return 0;
};

const runStatus = () => {
  const pid = runningPid();
  process.stdout.write(
    pid
      ? `Frontend build running (pid ${pid}).\n`
      : "Frontend build not running.\n"
  );
  return 0;
};

const runStop = () => {
  const pid = runningPid();
  if (!pid) {
    // Idempotent: stopping something that is not running is a success.
    process.stdout.write("Frontend build not running.\n");
    return 0;
  }
  killProcessTree(pid, "SIGTERM");
  removePid();
  process.stdout.write(`Stopped frontend build (pid ${pid}).\n`);
  return 0;
};

const runLogs = (follow) => {
  if (!fs.existsSync(logFile)) {
    process.stdout.write(`No frontend build log yet (${logFile}).\n`);
    return Promise.resolve(0);
  }
  if (!follow) {
    process.stdout.write(fs.readFileSync(logFile, "utf8"));
    return Promise.resolve(0);
  }
  return new Promise((resolve) => {
    const tail = spawn("tail", ["-f", logFile], { stdio: "inherit" });
    tail.on("error", () => {
      // No tail available; fall back to a one-shot dump.
      process.stdout.write(fs.readFileSync(logFile, "utf8"));
      resolve(0);
    });
    tail.on("exit", (code) => resolve(code ?? 0));
  });
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.unknown.length) {
    process.stderr.write(`Unknown arguments: ${args.unknown.join(" ")}\n`);
    usage();
    return 1;
  }
  switch (args.mode) {
    case "background":
      return runBackground(args.modern);
    case "status":
      return runStatus();
    case "stop":
      return runStop();
    case "logs":
      return runLogs(args.follow);
    default:
      return runForeground(args.modern);
  }
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    process.stderr.write(`${err?.stack || err}\n`);
    process.exitCode = 1;
  }
);
