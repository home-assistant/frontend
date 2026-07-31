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
//   --fetch-translations
//                      Fetch nightly translations before starting (app,
//                      app-serve, demo, and gallery only).
//
// Extra args (for example -p or -c on app-serve) are forwarded to the underlying
// script. Suites use one of two liveness models:
//
//   health   demo, gallery, e2e-app: a fixed port plus the /__ha_dev_status
//            endpoint each dev server exposes (see runDevServer in
//            build-scripts/gulp/rspack.js).
//   process  app (yarn dev) and app-serve (yarn dev:serve): plain yarn dev has
//            no port, so these treat the first "Build done" log line as ready.

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
  runCli,
  sleep,
  spawnDetachedToLog,
  spawnForeground,
  terminateDetachedProcess,
  terminateProcess,
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
const developAndServeScript = path.join(
  repoRoot,
  "script",
  "develop_and_serve"
);
const logDir = path.join(buildCacheDir, "ha-dev-server");

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
      fetchTranslations: true,
      liveness: "health",
      port: 8090,
      spawn: { cmd: gulpBin, args: ["develop-demo"] },
    },
  ],
  [
    "gallery",
    {
      alias: "dev:gallery",
      fetchTranslations: true,
      liveness: "health",
      port: 8100,
      spawn: { cmd: gulpBin, args: ["develop-gallery"] },
    },
  ],
  [
    "app",
    {
      alias: "dev",
      fetchTranslations: true,
      liveness: "process",
      readyLog: /Build done @/,
      spawn: { cmd: gulpBin, args: ["develop-app"] },
    },
  ],
  [
    "app-serve",
    {
      alias: "dev:serve",
      liveness: "process",
      acceptsArgs: true,
      fetchTranslations: true,
      readyLog: /Build done @/,
      spawn: { cmd: developAndServeScript, args: [] },
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
      `[--background | --status | --stop | --logs [--follow]] ` +
      `[--fetch-translations]\n`
  );
};

const parseArgs = (argv) => {
  const args = {
    fetchTranslations: false,
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
      case "--fetch-translations":
        args.fetchTranslations = true;
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

const translationPrebuildEnv = (token) => {
  const env = workflowLockEnv(token);
  delete env.SKIP_FETCH_NIGHTLY_TRANSLATIONS;
  return env;
};

const suiteEnv = (token, fetchTranslations = false) => ({
  ...workflowLockEnv(token),
  ...(fetchTranslations && { SKIP_FETCH_NIGHTLY_TRANSLATIONS: "1" }),
});

const runPrebuild = (token, fetchTranslations = false) =>
  fetchTranslations
    ? spawnForeground({
        cmd: gulpBin,
        args: ["setup-and-fetch-nightly-translations"],
        cwd: repoRoot,
        env: translationPrebuildEnv(token),
        processGroup: true,
      })
    : Promise.resolve(0);

const logFileFor = (suite) => path.join(logDir, `${suite}.log`);
const acquireSuite = (suite) => {
  const token = `${process.pid}-${Date.now()}-${Math.random()}`;
  const record = {
    pid: process.pid,
    startTime: processStartTime(process.pid),
    kind: "dev",
    suite,
    starting: true,
    token,
  };
  const result = acquireProcessRecord(workflowLockFile, record);
  return result.acquired ? { token } : { existing: result.existing };
};

const updateSuite = (suite, token, child, port) => {
  const existing = readProcessRecord(workflowLockFile);
  if (existing?.token !== token) {
    throw Error(`Dev server (${suite}) ownership was lost during startup.`);
  }
  writeProcessRecord(workflowLockFile, {
    ...existing,
    pid: child.pid,
    startTime: processStartTime(child.pid),
    processGroup: true,
    starting: false,
    port,
  });
};

const releaseSuite = (token) => releaseProcessRecord(workflowLockFile, token);

const readSuite = (suite) => {
  const existing = readProcessRecord(workflowLockFile);
  if (existing?.kind !== "dev" || existing.suite !== suite) {
    return undefined;
  }
  if (isProcessRecordAlive(existing)) {
    return existing;
  }
  releaseSuite(existing.token);
  return undefined;
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
  if (existing?.kind === "output") {
    process.stdout.write(
      `${describeOutputOwner(existing)} already owns the app output` +
        `${existing.pid ? ` (pid ${existing.pid})` : ""}.\n`
    );
    return;
  }
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

const acquireSuiteForStart = (suite) => {
  const lock = acquireSuite(suite);
  if (lock.token) {
    return lock;
  }
  reportProcessConflict(suite, lock.existing);
  return {
    code:
      lock.existing?.kind === "dev" &&
      lock.existing.suite === suite &&
      !lock.existing.starting
        ? 0
        : 1,
  };
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

const isHttpServing = async (port, timeoutMs = 1000) => {
  const probeHost = async (index) => {
    const host = PROBE_HOSTS[index];
    if (!host) {
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`http://${host}:${port}`, {
        signal: controller.signal,
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // Try the next address.
    } finally {
      clearTimeout(timer);
    }
    return probeHost(index + 1);
  };
  return probeHost(0);
};

const runForegroundHealth = async (suite, cfg, fetchTranslations = false) => {
  const { port } = cfg;
  const lock = acquireSuiteForStart(suite);
  if (!lock.token) {
    return lock.code;
  }
  const status = await probe(port);
  if (status.state === "ours") {
    releaseSuite(lock.token);
    process.stderr.write(
      `Port ${port} is already serving the ${status.suite ?? "unknown"} dev server.\n`
    );
    return 1;
  }
  if (status.state === "foreign") {
    releaseSuite(lock.token);
    process.stderr.write(
      `Port ${port} is in use by another process; not the ${suite} dev server.\n`
    );
    return 1;
  }
  try {
    const prebuildCode = await runPrebuild(lock.token, fetchTranslations);
    if (prebuildCode !== 0) {
      return prebuildCode;
    }
    return await spawnForeground({
      cmd: cfg.spawn.cmd,
      args: cfg.spawn.args,
      cwd: repoRoot,
      env: suiteEnv(lock.token, fetchTranslations),
      processGroup: true,
      onSpawn: (child) => updateSuite(suite, lock.token, child, port),
    });
  } finally {
    releaseSuite(lock.token);
  }
};

const runBackgroundHealth = async (suite, cfg, fetchTranslations = false) => {
  const { port } = cfg;
  const lock = acquireSuiteForStart(suite);
  if (!lock.token) {
    return lock.code;
  }
  const preflight = await probe(port);
  if (preflight.state === "ours") {
    releaseSuite(lock.token);
    process.stderr.write(
      `Port ${port} is already serving the ${preflight.suite ?? "unknown"} dev server.\n`
    );
    return 1;
  }
  if (preflight.state === "foreign") {
    releaseSuite(lock.token);
    process.stderr.write(
      `Port ${port} is in use by another process; not the ${suite} dev server.\n`
    );
    return 1;
  }
  let child;
  try {
    const prebuildCode = await runPrebuild(lock.token, fetchTranslations);
    if (prebuildCode !== 0) {
      releaseSuite(lock.token);
      return prebuildCode;
    }
    const logFile = logFileFor(suite);
    child = await spawnDetachedToLog({
      cmd: cfg.spawn.cmd,
      args: cfg.spawn.args,
      cwd: repoRoot,
      env: suiteEnv(lock.token, fetchTranslations),
      logFile,
    });
    updateSuite(suite, lock.token, child, port);
    return awaitReady({
      suite,
      child,
      logFile,
      port,
      isReady: async () => {
        const status = await probe(port, 1000);
        return status.state === "ours" && status.suite === suite;
      },
      onExit: () => releaseSuite(lock.token),
    });
  } catch (err) {
    if (child) {
      await terminateDetachedProcess(child);
    }
    releaseSuite(lock.token);
    throw err;
  }
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

const runForegroundProcess = async (
  suite,
  cfg,
  passthrough,
  fetchTranslations = false
) => {
  const lock = acquireSuiteForStart(suite);
  if (!lock.token) {
    return lock.code;
  }
  try {
    const prebuildCode = await runPrebuild(lock.token, fetchTranslations);
    if (prebuildCode !== 0) {
      return prebuildCode;
    }
    return await spawnForeground({
      cmd: cfg.spawn.cmd,
      args: spawnArgs(cfg, passthrough),
      cwd: repoRoot,
      env: suiteEnv(lock.token, fetchTranslations),
      processGroup: true,
      onSpawn: (child) => updateSuite(suite, lock.token, child),
    });
  } finally {
    releaseSuite(lock.token);
  }
};

const runBackgroundProcess = async (
  suite,
  cfg,
  passthrough,
  fetchTranslations = false
) => {
  const lock = acquireSuiteForStart(suite);
  if (!lock.token) {
    return lock.code;
  }

  let child;
  try {
    const prebuildCode = await runPrebuild(lock.token, fetchTranslations);
    if (prebuildCode !== 0) {
      releaseSuite(lock.token);
      return prebuildCode;
    }
    const logFile = logFileFor(suite);
    child = await spawnDetachedToLog({
      cmd: cfg.spawn.cmd,
      args: spawnArgs(cfg, passthrough),
      cwd: repoRoot,
      env: suiteEnv(lock.token, fetchTranslations),
      logFile,
    });

    const port = cfg.acceptsArgs ? resolveServePort(passthrough) : cfg.port;
    updateSuite(suite, lock.token, child, port);

    return awaitReady({
      suite,
      child,
      logFile,
      port,
      isReady: async () =>
        logIsReady(logFile, cfg.readyLog) &&
        (!cfg.acceptsArgs || (await isHttpServing(port))),
      onExit: () => releaseSuite(lock.token),
    });
  } catch (err) {
    if (child) {
      await terminateDetachedProcess(child);
    }
    releaseSuite(lock.token);
    throw err;
  }
};

const runStatusSuite = async (suite, cfg) => {
  const existing = readSuite(suite);
  if (existing) {
    process.stdout.write(
      `Dev server (${existing.suite ?? suite}) running${urlSuffix(existing.port ?? cfg.port)} ` +
        `(pid ${existing.pid})\n`
    );
  } else {
    process.stdout.write(`Dev server (${suite}) not running.\n`);
  }
  return 0;
};

const runStopSuite = async (suite) => {
  const existing = readSuite(suite);
  if (!existing) {
    process.stdout.write(`Dev server (${suite}) not running.\n`);
    return 0;
  }
  const { pid } = existing;
  const activeSuite = existing.suite ?? suite;
  return terminate(
    activeSuite,
    pid,
    () => !isProcessRecordAlive(existing),
    () => releaseSuite(existing.token)
  );
};

// --- shared -----------------------------------------------------------------

const runLogs = (suite, follow) => {
  const activeSuite = readSuite(suite)?.suite ?? suite;
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
  if (
    args.fetchTranslations &&
    (!["foreground", "background"].includes(args.mode) ||
      !cfg.fetchTranslations)
  ) {
    process.stderr.write(
      "--fetch-translations is only supported when starting app, app-serve, demo, or gallery.\n"
    );
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
  if (mode === "status") {
    return runStatusSuite(args.suite, cfg);
  }
  if (mode === "stop") {
    return runStopSuite(args.suite);
  }
  const handlers =
    cfg.liveness === "health"
      ? {
          foreground: () =>
            runForegroundHealth(args.suite, cfg, args.fetchTranslations),
          background: () =>
            runBackgroundHealth(args.suite, cfg, args.fetchTranslations),
        }
      : {
          foreground: () =>
            runForegroundProcess(
              args.suite,
              cfg,
              args.passthrough,
              args.fetchTranslations
            ),
          background: () =>
            runBackgroundProcess(
              args.suite,
              cfg,
              args.passthrough,
              args.fetchTranslations
            ),
        };
  return handlers[mode]();
};

runCli(main);
