// Manage a Home Assistant frontend dev server with an agent-friendly interface.
//
//   node build-scripts/dev-server.mjs --suite <suite> [mode] [extra args]
//
//   (no mode)          Run in the foreground.
//   --background       Start detached, wait until it is ready, print the URL
//                      (when it has one) and pid, then exit and leave it running.
//   --status           Report whether the suite's dev server is running.
//   --stop             Stop a running background dev server.
//   --logs [--follow]  Print (or follow) the background dev server log.
//
// Extra args (for example -p or -c on app-serve) are forwarded to the underlying
// script. Suites use one of two liveness models:
//
//   health   demo, gallery, e2e-app: a fixed port plus the /__ha_dev_status
//            endpoint each dev server exposes (see runDevServer in
//            build-scripts/gulp/rspack.js). The port is the source of truth and
//            the pid is found from it; no state file.
//   process  app (yarn dev) and app-serve (yarn dev:serve): the app watcher has
//            no health endpoint, and plain yarn dev has no port at all, so these
//            track a pidfile and treat the first "Build done" log line as ready.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
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
  removeProcessRecord,
  runCli,
  sleep,
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
const developAndServeScript = path.join(
  repoRoot,
  "script",
  "develop_and_serve"
);
const logDir = path.join(repoRoot, "node_modules", ".cache", "ha-dev-server");
const outputLockFile = path.join(
  repoRoot,
  "node_modules",
  ".cache",
  "ha-generated-output.lock"
);

// Each suite names its yarn alias (for hints), a liveness model, and how to
// spawn it. health suites carry a fixed port; process suites carry the log line
// that means "ready" and, for app-serve, forward extra args to the script.
const SUITES = new Map([
  [
    "e2e-app",
    {
      alias: "test:e2e:app:dev",
      liveness: "health",
      port: 8095,
      spawn: { cmd: gulpBin, args: ["develop-e2e-test-app"] },
    },
  ],
  [
    "demo",
    {
      alias: "dev:demo",
      liveness: "health",
      port: 8090,
      spawn: { cmd: gulpBin, args: ["develop-demo"] },
    },
  ],
  [
    "gallery",
    {
      alias: "dev:gallery",
      liveness: "health",
      port: 8100,
      spawn: { cmd: gulpBin, args: ["develop-gallery"] },
    },
  ],
  [
    "app",
    {
      alias: "dev",
      liveness: "process",
      readyLog: /Build done @/,
      spawn: { cmd: gulpBin, args: ["develop-app"] },
      processKey: "app",
    },
  ],
  [
    "app-serve",
    {
      alias: "dev:serve",
      liveness: "process",
      acceptsArgs: true,
      readyLog: /Build done @/,
      spawn: { cmd: developAndServeScript, args: [] },
      processKey: "app",
    },
  ],
]);

// Cover a cold build on a slow machine before the server starts listening.
// Override with HA_DEV_SERVER_TIMEOUT (seconds).
const readyTimeoutSeconds = Number(process.env.HA_DEV_SERVER_TIMEOUT || "180");
const READY_TIMEOUT_MS =
  Number.isFinite(readyTimeoutSeconds) && readyTimeoutSeconds > 0
    ? readyTimeoutSeconds * 1000
    : 180_000;

// Detect a coding agent from a small set of environment markers set by common
// agent CLIs (env-only; no process-ancestry detection).
const detectAgent = () => {
  const env = process.env;
  const has = (name) => Boolean(env[name]);
  const eq = (name, value) => env[name] === value;
  const signals = {
    opencode: () =>
      [
        "OPENCODE",
        "OPENCODE_BIN_PATH",
        "OPENCODE_SERVER",
        "OPENCODE_APP_INFO",
      ].some(has),
    "claude-code": () => has("CLAUDECODE"),
    cursor: () => has("CURSOR_TRACE_ID"),
    "github-copilot": () =>
      eq("TERM_PROGRAM", "vscode") && eq("GIT_PAGER", "cat"),
    // Convention shared by several agents (Crush, Amp, ...).
    generic: () => has("AGENT") || has("AI_AGENT"),
  };
  return Object.keys(signals).find((id) => signals[id]());
};

const usage = () => {
  const suites = [...SUITES.keys()].join("|");
  process.stderr.write(
    `Usage: node build-scripts/dev-server.mjs --suite <${suites}> ` +
      `[--background | --status | --stop | --logs [--follow]]\n`
  );
};

const parseArgs = (argv) => {
  const args = {
    mode: "foreground",
    follow: false,
    modes: [],
    suite: undefined,
    passthrough: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--suite":
        args.suite = argv[++i];
        break;
      case "--follow":
        args.follow = true;
        break;
      default:
        if (LIFECYCLE_MODE_FLAGS.has(arg)) {
          args.mode = LIFECYCLE_MODE_FLAGS.get(arg);
          args.modes.push(arg);
        } else {
          // Anything unrecognised is forwarded to the underlying script.
          args.passthrough.push(arg);
        }
    }
  }
  return args;
};

const logFileFor = (suite) => path.join(logDir, `${suite}.log`);
const pidFileFor = (suite) =>
  path.join(logDir, `${SUITES.get(suite).processKey ?? suite}.pid`);
const removePidFileIf = (suite, matches) => {
  const existing = readProcessRecord(pidFileFor(suite));
  if (!existing) {
    removeProcessRecord(pidFileFor(suite));
    return true;
  }
  if (matches(existing)) {
    releaseProcessRecord(outputLockFile, existing.token, () => {
      if (readProcessRecord(pidFileFor(suite))?.token === existing.token) {
        removeProcessRecord(pidFileFor(suite));
      }
    });
    return true;
  }
  return false;
};

const acquireProcessSuite = (suite) => {
  const pidFile = pidFileFor(suite);
  const token = `${process.pid}-${Date.now()}-${Math.random()}`;
  const record = {
    pid: process.pid,
    startTime: processStartTime(process.pid),
    kind: "dev",
    suite,
    starting: true,
    token,
  };
  const result = acquireProcessRecord(outputLockFile, record);
  if (!result.acquired) {
    return { existing: result.existing };
  }
  try {
    writeProcessRecord(pidFile, record);
  } catch (err) {
    releaseProcessRecord(outputLockFile, token);
    throw err;
  }
  return { token };
};

const updateProcessSuite = (suite, token, child) => {
  const existing = readPidFile(suite);
  if (existing?.token !== token) {
    throw Error(
      `Dev server (${suite}) process ownership was lost during startup.`
    );
  }
  const record = {
    ...existing,
    pid: child.pid,
    startTime: processStartTime(child.pid),
    starting: false,
  };
  writePidFile(suite, record);
  const outputOwner = readProcessRecord(outputLockFile);
  if (outputOwner?.token !== token) {
    throw Error(
      `Dev server (${suite}) output ownership was lost during startup.`
    );
  }
  writeProcessRecord(outputLockFile, record);
};

const releaseProcessSuite = (suite, token) => {
  releaseProcessRecord(outputLockFile, token, () => {
    if (readPidFile(suite)?.token === token) {
      removeProcessRecord(pidFileFor(suite));
    }
  });
};

const hints = (suite) => {
  const alias = `yarn ${SUITES.get(suite).alias}`;
  return (
    `  Stop:   ${alias} --stop\n` +
    `  Status: ${alias} --status\n` +
    `  Logs:   ${alias} --logs\n`
  );
};

const reportProcessConflict = (suite, existing) => {
  if (existing?.kind === "build") {
    process.stdout.write(
      `Frontend build already running${existing.pid ? ` (pid ${existing.pid})` : ""}. ` +
        "Stop it with yarn build --stop.\n"
    );
    return;
  }
  process.stdout.write(
    `Dev server (${existing?.suite ?? suite}) already running` +
      `${urlSuffix(existing?.port)} ` +
      `${existing?.pid ? `(pid ${existing.pid})` : ""}\n` +
      hints(existing?.suite ?? suite)
  );
};

// --- shared spawning and lifecycle ------------------------------------------

const urlSuffix = (port) => (port ? ` at http://localhost:${port}` : "");

// Poll until the server is ready, the child exits, or we time out. Prints the
// progress dots and outcome; returns 0 when ready, 1 otherwise. onExit runs if
// the child dies before it is ready (used to clear a stale pidfile).
const awaitReady = async ({ suite, child, logFile, port, isReady, onExit }) => {
  let childExited = false;
  child.on("exit", () => {
    childExited = true;
  });
  const deadline = Date.now() + READY_TIMEOUT_MS;
  process.stdout.write(`Starting ${suite} dev server`);
  const poll = async () => {
    if (childExited) {
      process.stdout.write("\n");
      process.stderr.write(
        `Dev server (${suite}) exited before it was ready. See ${logFile}\n`
      );
      onExit?.();
      return 1;
    }
    if (await isReady()) {
      process.stdout.write("\n");
      process.stdout.write(
        `Dev server (${suite}) running${urlSuffix(port)} ` +
          `(pid ${child.pid})\n${hints(suite)}`
      );
      return 0;
    }
    if (Date.now() >= deadline) {
      return undefined;
    }
    process.stdout.write(".");
    await sleep(1000);
    return poll();
  };
  const result = await poll();
  if (result !== undefined) {
    return result;
  }
  process.stdout.write("\n");
  process.stderr.write(
    `Dev server (${suite}) did not become ready within ${
      READY_TIMEOUT_MS / 1000
    }s. See ${logFile}\n`
  );
  const stopped = await terminateProcess({
    pid: child.pid,
    isStopped: () => childExited,
  });
  if (stopped) {
    onExit?.();
  }
  return 1;
};

// Stop a running background server: SIGTERM, wait for it to go, then SIGKILL.
// isStopped reports when it is gone; onStopped runs on success (pidfile cleanup).
const terminate = async (suite, pid, isStopped, onStopped) => {
  if (!(await terminateProcess({ pid, isStopped }))) {
    process.stderr.write(
      `Failed to stop dev server (${suite}) (pid ${pid}). Stop it manually.\n`
    );
    return 1;
  }
  onStopped?.();
  process.stdout.write(`Stopped dev server (${suite}) (pid ${pid}).\n`);
  return 0;
};

// --- health liveness (port + /__ha_dev_status) ------------------------------

/**
 * Probe the health endpoint. Dev servers bind IPv4 or IPv6 localhost depending
 * on the OS, so try each; the port is "free" only if every address refuses.
 * @returns {Promise<{state: "ours" | "foreign" | "free", suite?: string}>}
 */
const PROBE_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

const probe = async (port, timeoutMs = 1000) => {
  const probeHost = async (index, sawResponse) => {
    const host = PROBE_HOSTS[index];
    if (!host) {
      return sawResponse ? { state: "foreign" } : { state: "free" };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`http://${host}:${port}/__ha_dev_status`, {
        signal: controller.signal,
      });
      sawResponse = true;
      if (res.ok) {
        const body = await res.json().catch(() => null);
        if (body && body.server === "ha-frontend-dev") {
          return { state: "ours", suite: body.suite };
        }
      }
    } catch {
      // Try the next address.
    } finally {
      clearTimeout(timer);
    }
    return probeHost(index + 1, sawResponse);
  };
  return probeHost(0, false);
};

// Find the pid listening on a port via the first available tool (no state file).
const pidFromPort = (port) => {
  const attempts = [
    [
      "lsof",
      ["-ti", `tcp:${port}`, "-sTCP:LISTEN"],
      (out) => out.trim().split("\n")[0],
    ],
    [
      "ss",
      ["-ltnpH", `sport = :${port}`],
      (out) => out.match(/pid=(\d+)/)?.[1],
    ],
    ["fuser", [`${port}/tcp`], (out) => out.trim().split(/\s+/)[0]],
  ];
  for (const [cmd, cmdArgs, extract] of attempts) {
    try {
      const out = execFileSync(cmd, cmdArgs, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pid = Number(extract(out));
      if (Number.isInteger(pid) && pid > 0) {
        return pid;
      }
    } catch {
      // Try the next tool.
    }
  }
  return undefined;
};

const runForegroundHealth = async (suite, cfg) => {
  const { port } = cfg;
  const status = await probe(port);
  if (status.state === "ours" && status.suite === suite) {
    process.stdout.write(
      `Dev server (${suite}) is already running at http://localhost:${port}\n`
    );
    return 0;
  }
  if (status.state === "ours") {
    process.stderr.write(
      `Port ${port} is serving the ${status.suite ?? "unknown"} dev server; not ${suite}.\n`
    );
    return 1;
  }
  if (status.state === "foreign") {
    process.stderr.write(
      `Port ${port} is in use by another process; not the ${suite} dev server.\n`
    );
    return 1;
  }
  return spawnForeground({
    cmd: cfg.spawn.cmd,
    args: cfg.spawn.args,
    cwd: repoRoot,
  });
};

const runBackgroundHealth = async (suite, cfg) => {
  const { port } = cfg;
  const preflight = await probe(port);
  if (preflight.state === "ours" && preflight.suite === suite) {
    const pid = pidFromPort(port);
    process.stdout.write(
      `Dev server (${suite}) already running at http://localhost:${port}` +
        `${pid ? ` (pid ${pid})` : ""}\n${hints(suite)}`
    );
    return 0;
  }
  if (preflight.state === "ours") {
    process.stderr.write(
      `Port ${port} is serving the ${preflight.suite ?? "unknown"} dev server; not ${suite}.\n`
    );
    return 1;
  }
  if (preflight.state === "foreign") {
    process.stderr.write(
      `Port ${port} is in use by another process; not the ${suite} dev server.\n`
    );
    return 1;
  }

  const logFile = logFileFor(suite);
  const child = await spawnDetachedToLog({
    cmd: cfg.spawn.cmd,
    args: cfg.spawn.args,
    cwd: repoRoot,
    logFile,
  });
  return awaitReady({
    suite,
    child,
    logFile,
    port,
    isReady: async () => {
      const status = await probe(port, 1000);
      return status.state === "ours" && status.suite === suite;
    },
  });
};

const runStatusHealth = async (suite, cfg) => {
  const { port } = cfg;
  const status = await probe(port);
  if (status.state === "ours" && status.suite === suite) {
    const pid = pidFromPort(port);
    process.stdout.write(
      `Dev server (${suite}) running at http://localhost:${port}` +
        `${pid ? ` (pid ${pid})` : ""}\n`
    );
  } else if (status.state === "ours") {
    process.stdout.write(
      `Port ${port} is serving a different Home Assistant frontend dev server (suite ${status.suite ?? "unknown"}); not ${suite}.\n`
    );
  } else if (status.state === "foreign") {
    process.stdout.write(
      `Port ${port} is in use by another process; not the ${suite} dev server.\n`
    );
  } else {
    process.stdout.write(`Dev server (${suite}) not running.\n`);
  }
  return 0;
};

const runStopHealth = async (suite, cfg) => {
  const { port } = cfg;
  const status = await probe(port);
  if (!(status.state === "ours" && status.suite === suite)) {
    // Idempotent: stopping something that is not running is a success.
    process.stdout.write(`Dev server (${suite}) not running.\n`);
    return 0;
  }
  const pid = pidFromPort(port);
  if (!pid) {
    process.stderr.write(
      `Dev server (${suite}) is running but its pid could not be found ` +
        `(no lsof/ss/fuser?). Stop it manually.\n`
    );
    return 1;
  }
  return terminate(
    suite,
    pid,
    async () => (await probe(port, 800)).state === "free"
  );
};

// --- process liveness (pidfile + log-readiness) -----------------------------

const readPidFile = (suite) => {
  return readProcessRecord(pidFileFor(suite));
};

const writePidFile = (suite, data) => {
  writeProcessRecord(pidFileFor(suite), data);
};

const logIsReady = (logFile, readyLog) => {
  try {
    return readyLog.test(fs.readFileSync(logFile, "utf8"));
  } catch {
    return false;
  }
};

// app-serve serves on 8124 by default (8123 in a devcontainer), or whatever -p
// the caller passed. Used only to show a URL; liveness comes from the pidfile.
const resolveServePort = (passthrough) => {
  for (let i = passthrough.length - 1; i >= 0; i--) {
    const arg = passthrough[i];
    if (arg === "-p" || arg.startsWith("-p")) {
      const port = Number(arg === "-p" ? passthrough[i + 1] : arg.slice(2));
      if (Number.isInteger(port) && port > 0) {
        return port;
      }
    }
  }
  return process.env.DEVCONTAINER ? 8123 : 8124;
};

const spawnArgs = (cfg, passthrough) => [
  ...cfg.spawn.args,
  ...(cfg.acceptsArgs ? passthrough : []),
];

const runForegroundProcess = async (suite, cfg, passthrough) => {
  const lock = acquireProcessSuite(suite);
  if (!lock.token) {
    reportProcessConflict(suite, lock.existing);
    return 0;
  }
  try {
    return await spawnForeground({
      cmd: cfg.spawn.cmd,
      args: spawnArgs(cfg, passthrough),
      cwd: repoRoot,
      processGroup: true,
      onSpawn: (child) => updateProcessSuite(suite, lock.token, child),
    });
  } finally {
    releaseProcessSuite(suite, lock.token);
  }
};

const runBackgroundProcess = async (suite, cfg, passthrough) => {
  const lock = acquireProcessSuite(suite);
  if (!lock.token) {
    reportProcessConflict(suite, lock.existing);
    return 0;
  }

  try {
    const logFile = logFileFor(suite);
    const child = await spawnDetachedToLog({
      cmd: cfg.spawn.cmd,
      args: spawnArgs(cfg, passthrough),
      cwd: repoRoot,
      logFile,
    });

    const port = cfg.acceptsArgs ? resolveServePort(passthrough) : cfg.port;
    updateProcessSuite(suite, lock.token, child);
    writePidFile(suite, { ...readPidFile(suite), port });

    return awaitReady({
      suite,
      child,
      logFile,
      port,
      isReady: () => logIsReady(logFile, cfg.readyLog),
      onExit: () => releaseProcessSuite(suite, lock.token),
    });
  } catch (err) {
    releaseProcessSuite(suite, lock.token);
    throw err;
  }
};

const runStatusProcess = async (suite) => {
  const existing = readPidFile(suite);
  if (existing && isProcessRecordAlive(existing)) {
    process.stdout.write(
      `Dev server (${existing.suite ?? suite}) running${urlSuffix(existing.port)} ` +
        `(pid ${existing.pid})\n`
    );
  } else {
    if (existing) {
      removePidFileIf(
        suite,
        (current) =>
          current.token === existing.token && !isProcessRecordAlive(current)
      );
    }
    process.stdout.write(`Dev server (${suite}) not running.\n`);
  }
  return 0;
};

const runStopProcess = async (suite) => {
  let existing = readPidFile(suite);
  if (existing?.starting) {
    const token = existing.token;
    await waitFor(
      () => {
        const current = readPidFile(suite);
        return !current?.starting || current.token !== token;
      },
      100,
      5000
    );
    existing = readPidFile(suite);
  }
  if (!existing || !isProcessRecordAlive(existing)) {
    // Idempotent: stopping something that is not running is a success.
    if (existing) {
      removePidFileIf(
        suite,
        (current) =>
          current.token === existing.token && !isProcessRecordAlive(current)
      );
    }
    process.stdout.write(`Dev server (${suite}) not running.\n`);
    return 0;
  }
  const { pid } = existing;
  const activeSuite = existing.suite ?? suite;
  return terminate(
    activeSuite,
    pid,
    () => !isProcessRecordAlive(existing),
    () => releaseProcessSuite(activeSuite, existing.token)
  );
};

// --- shared -----------------------------------------------------------------

const runLogs = (suite, follow) => {
  const activeSuite = readPidFile(suite)?.suite ?? suite;
  return outputLog(
    logFileFor(activeSuite),
    follow,
    `No log for the ${activeSuite} dev server yet (${logFileFor(activeSuite)}).\n`
  );
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const cfg = SUITES.get(args.suite);
  if (!cfg) {
    usage();
    return 1;
  }
  if (args.modes.length > 1 || (args.follow && args.mode !== "logs")) {
    process.stderr.write("Invalid combination of lifecycle arguments.\n");
    usage();
    return 1;
  }
  if (args.passthrough.length && !cfg.acceptsArgs) {
    process.stderr.write(
      `Ignoring unexpected arguments: ${args.passthrough.join(" ")}\n`
    );
  }

  // A plain dev:<suite> under a coding agent backgrounds itself; explicit modes
  // are untouched.
  let { mode } = args;
  if (
    mode === "foreground" &&
    !["0", "false"].includes(process.env.HA_DEV_BACKGROUND)
  ) {
    const agent = detectAgent();
    if (agent) {
      process.stdout.write(
        `Detected coding agent (${agent}); starting in the background. ` +
          `Set HA_DEV_BACKGROUND=0 to force foreground.\n`
      );
      mode = "background";
    }
  }

  if (mode === "logs") {
    return runLogs(args.suite, args.follow);
  }
  const handlers =
    cfg.liveness === "health"
      ? {
          foreground: () => runForegroundHealth(args.suite, cfg),
          background: () => runBackgroundHealth(args.suite, cfg),
          status: () => runStatusHealth(args.suite, cfg),
          stop: () => runStopHealth(args.suite, cfg),
        }
      : {
          foreground: () =>
            runForegroundProcess(args.suite, cfg, args.passthrough),
          background: () =>
            runBackgroundProcess(args.suite, cfg, args.passthrough),
          status: () => runStatusProcess(args.suite),
          stop: () => runStopProcess(args.suite),
        };
  return handlers[mode]();
};

runCli(main);
