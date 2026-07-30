import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const LIFECYCLE_MODE_FLAGS = new Map([
  ["--background", "background"],
  ["--status", "status"],
  ["--stop", "stop"],
  ["--logs", "logs"],
]);

export const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const waitFor = async (predicate, intervalMs, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  const poll = async () => {
    if (await predicate()) {
      return true;
    }
    if (Date.now() >= deadline) {
      return false;
    }
    await sleep(intervalMs);
    return poll();
  };
  return poll();
};

export const isProcessAlive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) {
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

export const processStartTime = (pid) => {
  if (!isProcessAlive(pid)) {
    return undefined;
  }
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19];
  } catch {
    try {
      return execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return undefined;
    }
  }
};

export const isProcessRecordAlive = ({ pid, startTime }) =>
  Boolean(startTime) && processStartTime(pid) === startTime;

export const readProcessRecord = (file) => {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data && Number.isInteger(data.pid) ? data : undefined;
  } catch (err) {
    if (err.code === "ENOENT" || err instanceof SyntaxError) {
      return undefined;
    }
    throw err;
  }
};

export const writeProcessRecord = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(data));
    fs.renameSync(temporary, file);
  } finally {
    removeFileIfExists(temporary);
  }
};

export const removeProcessRecord = (file) => {
  removeFileIfExists(file);
};

export const acquireProcessRecord = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(file, "wx");
      try {
        fs.writeFileSync(fd, JSON.stringify(data));
      } finally {
        fs.closeSync(fd);
      }
      return { acquired: true };
    } catch (err) {
      if (err.code !== "EEXIST") {
        throw err;
      }
      const existing = readProcessRecord(file);
      if (existing && isProcessRecordAlive(existing)) {
        return { acquired: false, existing };
      }
      if (!existing && isRecentFile(file)) {
        return { acquired: false };
      }
      const removed = withExclusiveFileLockSync(`${file}.cleanup`, () => {
        const current = readProcessRecord(file);
        if (
          current &&
          (current.token !== existing?.token || isProcessRecordAlive(current))
        ) {
          return false;
        }
        removeProcessRecord(file);
        return true;
      });
      if (!removed.acquired || !removed.value) {
        return { acquired: false, existing: readProcessRecord(file) };
      }
    }
  }
  return { acquired: false, existing: readProcessRecord(file) };
};

export const releaseProcessRecord = (file, token, onRelease) => {
  if (!token) {
    return;
  }
  withExclusiveFileLockSync(`${file}.cleanup`, () => {
    const existing = readProcessRecord(file);
    if (!existing || existing.token === token) {
      onRelease?.();
      if (existing) {
        removeProcessRecord(file);
      }
    }
  });
};

const removeFileIfExists = (file) => {
  try {
    fs.rmSync(file);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
};

const isRecentFile = (file) => {
  try {
    return Date.now() - fs.statSync(file).mtimeMs < 5000;
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
};

export const withExclusiveFileLockSync = (file, operation) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    let fd;
    try {
      fd = fs.openSync(file, "wx");
    } catch (err) {
      if (err.code !== "EEXIST") {
        throw err;
      }
      const owner = readProcessRecord(file);
      if (owner && isProcessRecordAlive(owner)) {
        return { acquired: false };
      }
      if (!owner && isRecentFile(file)) {
        return { acquired: false };
      }
      removeFileIfExists(file);
      continue;
    }
    try {
      fs.writeFileSync(
        fd,
        JSON.stringify({
          pid: process.pid,
          startTime: processStartTime(process.pid),
        })
      );
      return { acquired: true, value: operation() };
    } finally {
      try {
        fs.closeSync(fd);
      } finally {
        removeFileIfExists(file);
      }
    }
  }
  return { acquired: false };
};

export const spawnForeground = ({
  cmd,
  args,
  cwd,
  env,
  processGroup = false,
  onSpawn,
}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      detached: processGroup,
      env,
      stdio: "inherit",
    });
    let settled = false;
    const forwardSigint = () =>
      signalProcess(child.pid, "SIGINT", processGroup);
    const forwardSigterm = () =>
      signalProcess(child.pid, "SIGTERM", processGroup);
    const forwardSighup = () =>
      signalProcess(child.pid, "SIGHUP", processGroup);
    const removeSignalHandlers = () => {
      process.off("SIGINT", forwardSigint);
      process.off("SIGTERM", forwardSigterm);
      process.off("SIGHUP", forwardSighup);
    };
    if (processGroup) {
      process.on("SIGINT", forwardSigint);
      process.on("SIGTERM", forwardSigterm);
      process.on("SIGHUP", forwardSighup);
    }
    child.once("spawn", () => {
      try {
        onSpawn?.(child);
      } catch (err) {
        settled = true;
        signalProcess(child.pid, "SIGTERM", processGroup);
        removeSignalHandlers();
        reject(err);
      }
    });
    child.once("error", (err) => {
      if (!settled) {
        settled = true;
        removeSignalHandlers();
        process.stderr.write(`Failed to start ${cmd}: ${err.message}\n`);
        resolve(1);
      }
    });
    child.once("exit", (code) => {
      if (!settled) {
        settled = true;
        removeSignalHandlers();
        resolve(code ?? 1);
      }
    });
  });

export const spawnDetachedToLog = ({ cmd, args, cwd, env, logFile }) =>
  new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const fd = fs.openSync(logFile, "w");
    let child;
    try {
      child = spawn(cmd, args, {
        cwd,
        detached: true,
        env,
        stdio: ["ignore", fd, fd],
      });
    } finally {
      fs.closeSync(fd);
    }
    child.once("spawn", () => {
      child.unref();
      resolve(child);
    });
    child.once("error", reject);
  });

const signalProcess = (pid, signal, processGroup) => {
  if (processGroup) {
    try {
      process.kill(-pid, signal);
      return;
    } catch {
      // Fall back to the process itself.
    }
  }
  try {
    process.kill(pid, signal);
  } catch {
    // Already gone.
  }
};

export const terminateProcess = async ({
  pid,
  isStopped,
  processGroup = true,
  graceMs = 10_000,
}) => {
  signalProcess(pid, "SIGTERM", processGroup);
  if (await waitFor(isStopped, 300, graceMs)) {
    return true;
  }
  signalProcess(pid, "SIGKILL", processGroup);
  await sleep(300);
  return await isStopped();
};

export const outputLog = (logFile, follow, missingMessage) => {
  if (!fs.existsSync(logFile)) {
    process.stdout.write(missingMessage);
    return Promise.resolve(0);
  }
  if (!follow) {
    process.stdout.write(fs.readFileSync(logFile, "utf8"));
    return Promise.resolve(0);
  }
  return new Promise((resolve) => {
    const tail = spawn("tail", ["-f", logFile], { stdio: "inherit" });
    let settled = false;
    tail.once("error", () => {
      if (!settled) {
        settled = true;
        process.stdout.write(fs.readFileSync(logFile, "utf8"));
        resolve(0);
      }
    });
    tail.once("exit", (code) => {
      if (!settled) {
        settled = true;
        resolve(code ?? 1);
      }
    });
  });
};

export const runCli = (main) => {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      process.stderr.write(`${err?.stack || err}\n`);
      process.exitCode = 1;
    }
  );
};
