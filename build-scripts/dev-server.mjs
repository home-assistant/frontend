// Manage a Home Assistant frontend dev server (demo, gallery, or the e2e test
// app) with an agent-friendly interface. Demo and gallery are the normal
// preview servers; only "app" is e2e-specific.
//
//   node build-scripts/dev-server.mjs --suite <app|demo|gallery> [mode]
//
//   (no mode)          Run in the foreground.
//   --background       Start detached, wait until it is serving, print the URL
//                      and pid, then exit and leave it running.
//   --status           Report whether the suite's dev server is running.
//   --stop             Stop a running background dev server.
//   --logs [--follow]  Print (or follow) the background dev server log.
//
// Liveness comes from the /__ha_dev_status endpoint each dev server exposes (see
// runDevServer in build-scripts/gulp/rspack.js). There is no lockfile: the port
// is the source of truth and the pid is found from it when we need to stop.

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const gulpBin = path.join(repoRoot, "node_modules", ".bin", "gulp");
const logDir = path.join(repoRoot, "node_modules", ".cache", "ha-dev-server");

// suite -> gulp dev task, port, and the yarn alias that launches it.
const SUITES = {
  app: {
    task: "develop-e2e-test-app",
    port: 8095,
    alias: "test:e2e:app:dev",
  },
  demo: { task: "develop-demo", port: 8090, alias: "dev:demo" },
  gallery: { task: "develop-gallery", port: 8100, alias: "dev:gallery" },
};

// Cover a cold build on a slow machine before the server starts listening.
// Override with HA_DEV_SERVER_TIMEOUT (seconds).
const READY_TIMEOUT_MS =
  Number(process.env.HA_DEV_SERVER_TIMEOUT || "180") * 1000;

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
  const suites = Object.keys(SUITES).join("|");
  process.stderr.write(
    `Usage: node build-scripts/dev-server.mjs --suite <${suites}> ` +
      `[--background | --status | --stop | --logs [--follow]]\n`
  );
};

const parseArgs = (argv) => {
  const args = { mode: "foreground", follow: false, suite: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--suite":
        args.suite = argv[++i];
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
        process.stderr.write(`Unknown argument: ${arg}\n`);
    }
  }
  return args;
};

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const logFileFor = (suite) => path.join(logDir, `${suite}.log`);

/**
 * Probe the health endpoint. Dev servers bind IPv4 or IPv6 localhost depending
 * on the OS, so try each; the port is "free" only if every address refuses.
 * @returns {Promise<{state: "ours" | "foreign" | "free", suite?: string}>}
 */
const PROBE_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

const probe = async (port, timeoutMs = 1000) => {
  let sawResponse = false;
  /* eslint-disable no-await-in-loop -- probe localhost addresses in order, stopping at the first that answers */
  for (const host of PROBE_HOSTS) {
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
  }
  /* eslint-enable no-await-in-loop */
  return sawResponse ? { state: "foreign" } : { state: "free" };
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

const hints = (suite) => {
  const alias = `yarn ${SUITES[suite].alias}`;
  return (
    `  Stop:   ${alias} --stop\n` +
    `  Status: ${alias} --status\n` +
    `  Logs:   ${alias} --logs\n`
  );
};

const runForeground = (suite, task, port) =>
  probe(port).then((status) => {
    if (status.state === "ours" && status.suite === suite) {
      process.stdout.write(
        `Dev server (${suite}) is already running at http://localhost:${port}\n`
      );
      return 0;
    }
    if (status.state === "foreign") {
      process.stderr.write(
        `Port ${port} is in use by another process; not the ${suite} dev server.\n`
      );
      return 1;
    }
    const child = spawn(gulpBin, [task], {
      cwd: repoRoot,
      stdio: "inherit",
    });
    return new Promise((resolve) => {
      child.on("exit", (code) => resolve(code ?? 0));
    });
  });

const runBackground = async (suite, task, port) => {
  const preflight = await probe(port);
  if (preflight.state === "ours" && preflight.suite === suite) {
    const pid = pidFromPort(port);
    process.stdout.write(
      `Dev server (${suite}) already running at http://localhost:${port}` +
        `${pid ? ` (pid ${pid})` : ""}\n${hints(suite)}`
    );
    return 0;
  }
  if (preflight.state === "foreign") {
    process.stderr.write(
      `Port ${port} is in use by another process; not the ${suite} dev server.\n`
    );
    return 1;
  }

  fs.mkdirSync(logDir, { recursive: true });
  const logFile = logFileFor(suite);
  const fd = fs.openSync(logFile, "w");
  const child = spawn(gulpBin, [task], {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", fd, fd],
  });
  fs.closeSync(fd);
  child.unref();

  let childExited = false;
  child.on("exit", () => {
    childExited = true;
  });

  const deadline = Date.now() + READY_TIMEOUT_MS;
  process.stdout.write(`Starting ${suite} dev server`);
  /* eslint-disable no-await-in-loop -- poll the health endpoint until the server is ready */
  while (Date.now() < deadline) {
    if (childExited) {
      process.stdout.write("\n");
      process.stderr.write(
        `Dev server (${suite}) exited before it was ready. See ${logFile}\n`
      );
      return 1;
    }
    const status = await probe(port, 1000);
    if (status.state === "ours" && status.suite === suite) {
      process.stdout.write("\n");
      process.stdout.write(
        `Dev server (${suite}) running at http://localhost:${port} ` +
          `(pid ${child.pid})\n${hints(suite)}`
      );
      return 0;
    }
    process.stdout.write(".");
    await sleep(1000);
  }
  /* eslint-enable no-await-in-loop */
  process.stdout.write("\n");
  process.stderr.write(
    `Dev server (${suite}) did not become ready within ${
      READY_TIMEOUT_MS / 1000
    }s. See ${logFile}\n`
  );
  return 1;
};

const runStatus = async (suite, _task, port) => {
  const status = await probe(port);
  if (status.state === "ours" && status.suite === suite) {
    const pid = pidFromPort(port);
    process.stdout.write(
      `Dev server (${suite}) running at http://localhost:${port}` +
        `${pid ? ` (pid ${pid})` : ""}\n`
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

const runStop = async (suite, _task, port) => {
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
  const signal = (sig) => {
    // The background server is its own process group leader, so signal the
    // whole group; fall back to the bare pid if that is not permitted.
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

  signal("SIGTERM");
  const deadline = Date.now() + 10_000;
  /* eslint-disable no-await-in-loop -- poll until the port stops answering */
  while (Date.now() < deadline) {
    await sleep(300);
    if ((await probe(port, 800)).state === "free") {
      process.stdout.write(`Stopped dev server (${suite}) (pid ${pid}).\n`);
      return 0;
    }
  }
  /* eslint-enable no-await-in-loop */
  // Escalate if it is still up.
  signal("SIGKILL");
  process.stdout.write(`Stopped dev server (${suite}) (pid ${pid}).\n`);
  return 0;
};

const runLogs = (suite, _task, _port, follow) => {
  const logFile = logFileFor(suite);
  if (!fs.existsSync(logFile)) {
    process.stdout.write(
      `No log for the ${suite} dev server yet (${logFile}).\n`
    );
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
  if (!args.suite || !SUITES[args.suite]) {
    usage();
    return 1;
  }
  const { task, port } = SUITES[args.suite];

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

  switch (mode) {
    case "background":
      return runBackground(args.suite, task, port);
    case "status":
      return runStatus(args.suite, task, port);
    case "stop":
      return runStop(args.suite, task, port);
    case "logs":
      return runLogs(args.suite, task, port, args.follow);
    default:
      return runForeground(args.suite, task, port);
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
