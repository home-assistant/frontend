import { describe, expect, it } from "vitest";
import { parseSupervisorAppEvent } from "../../../src/data/supervisor/supervisor";

const jobEvent = (data: Record<string, unknown>) => ({
  event: "job",
  data: {
    name: "app_manager_install",
    reference: "core_ssh",
    done: true,
    parent_id: null,
    errors: [],
    ...data,
  },
});

describe("parseSupervisorAppEvent", () => {
  it("parses state events with the legacy and the v2 name", () => {
    for (const name of ["addon", "app"]) {
      expect(
        parseSupervisorAppEvent({
          event: name,
          slug: "core_ssh",
          state: "started",
        })
      ).toEqual({ type: "state", slug: "core_ssh", state: "started" });
    }
  });

  it("parses finished manager jobs with the legacy and the current name", () => {
    for (const name of ["app_manager_update", "addon_manager_update"]) {
      expect(parseSupervisorAppEvent(jobEvent({ name }))).toEqual({
        type: "job",
        slug: "core_ssh",
        operation: "update",
        done: true,
        failed: false,
      });
    }
  });

  it("marks a job with errors as failed", () => {
    expect(
      parseSupervisorAppEvent(
        jobEvent({ name: "app_manager_uninstall", errors: [{}] })
      )
    ).toMatchObject({ operation: "uninstall", failed: true });
  });

  it("parses running manager jobs once they have a reference", () => {
    expect(parseSupervisorAppEvent(jobEvent({ done: false }))).toMatchObject({
      operation: "install",
      done: false,
    });
    expect(
      parseSupervisorAppEvent(jobEvent({ done: false, reference: null }))
    ).toBeUndefined();
  });

  it("ignores child, start and unrelated jobs", () => {
    expect(
      parseSupervisorAppEvent(jobEvent({ parent_id: "abc" }))
    ).toBeUndefined();
    expect(
      parseSupervisorAppEvent(jobEvent({ name: "app_start" }))
    ).toBeUndefined();
    expect(
      parseSupervisorAppEvent(jobEvent({ name: "backup_manager_full_backup" }))
    ).toBeUndefined();
    expect(
      parseSupervisorAppEvent({
        event: "supervisor_update",
        update_key: "addon",
      })
    ).toBeUndefined();
  });
});
