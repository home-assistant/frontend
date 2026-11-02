import { describe, expect, it } from "vitest";
import { isSupervisorLogError } from "../../landing-page/src/data/supervisor";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";

describe("isSupervisorLogError", () => {
  it.each([
    [
      "a colored line with milliseconds",
      `${RED}2026-10-21 22:27:32.135 ERROR (MainThread) [supervisor.docker.interface] Can't install`,
    ],
    [
      "a colored line with UTC offset",
      `${RED}2026-10-21 22:27:32.140+02:00 CRITICAL (MainThread) [supervisor.supervisor] Update of Supervisor failed`,
    ],
    [
      "a line with multiple color codes",
      `\x1b[1m${RED}2026-10-21 22:27:32.140+02:00 ERROR (MainThread) [supervisor.core] Failed`,
    ],
    [
      "an uncolored line with negative UTC offset",
      "2026-10-21 22:27:32.135-05:00 ERROR (MainThread) [supervisor.core] Failed",
    ],
    [
      "a line without milliseconds",
      "2026-10-21 22:27:32 ERROR (MainThread) [supervisor.core] Failed",
    ],
  ])("matches %s", (_description, line) => {
    expect(isSupervisorLogError(line)).toBe(true);
  });

  it.each([
    [
      "an info line",
      `${GREEN}2026-10-21 22:27:20.388+02:00 INFO (MainThread) [supervisor.supervisor] Update Supervisor`,
    ],
    [
      "a warning line",
      "\x1b[33m2026-10-21 22:27:32.141+02:00 WARNING (MainThread) [supervisor.jobs] Detached job supervisor_update failed",
    ],
    [
      "an info line mentioning an error",
      `${GREEN}2026-10-21 22:27:20.388+02:00 INFO (MainThread) [supervisor.jobs] Retry after ERROR`,
    ],
    ["an error level in a message", "Traceback: ERROR something went wrong"],
  ])("does not match %s", (_description, line) => {
    expect(isSupervisorLogError(line)).toBe(false);
  });

  it("gives the same result when called repeatedly", () => {
    const line = `${RED}2026-10-21 22:27:32.135+02:00 ERROR (MainThread) [supervisor.core] Failed`;
    expect(isSupervisorLogError(line)).toBe(true);
    expect(isSupervisorLogError(line)).toBe(true);
  });
});
