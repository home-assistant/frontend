import type { ReactiveControllerHost } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TraceRunController } from "../../src/data/trace-run-controller";

// The trace pages rely on these rules to keep the shown run, the URL and the
// browser history in step while links, history steps, picks and responses
// overlap. Each case is a race that once showed the wrong run.

const PATH = "/config/script/trace/my_script";

const createHost = (): ReactiveControllerHost => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

const navigate = (url: string) => {
  history.pushState(null, "", url);
  window.dispatchEvent(new CustomEvent("location-changed"));
};

const historyStep = (url: string) => {
  history.replaceState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

describe("TraceRunController", () => {
  let shownRunId: string | undefined;
  let loadedRuns: string[];
  let controller: TraceRunController;

  beforeEach(() => {
    history.replaceState(null, "", `${PATH}?run_id=a`);
    shownRunId = "a";
    loadedRuns = [];
    controller = new TraceRunController(createHost(), {
      tracePath: () => PATH,
      shownRunId: () => shownRunId,
      loadRun: (runId) => loadedRuns.push(runId),
    });
    controller.hostConnected();
  });

  afterEach(() => {
    controller.hostDisconnected();
  });

  it("loads another run of the same page named by a link", () => {
    navigate(`${PATH}?run_id=b`);
    expect(loadedRuns).toEqual(["b"]);
  });

  it("follows browser back and forward like a link", () => {
    historyStep(`${PATH}?run_id=b`);
    expect(loadedRuns).toEqual(["b"]);
  });

  it("ignores other pages, entries without a run and the shown run", () => {
    navigate("/config/script/trace/other_script?run_id=b");
    navigate(PATH);
    navigate(`${PATH}?run_id=a`);
    expect(loadedRuns).toEqual([]);
  });

  it("does not load a run that is already on its way", () => {
    controller.startListRequest("b");
    navigate(`${PATH}?run_id=b`);
    expect(loadedRuns).toEqual([]);
  });

  it("drops a pending link when the URL returns to the shown run", () => {
    const request = controller.startListRequest("b");
    historyStep(`${PATH}?run_id=a`);
    expect(controller.isLatestListRequest(request)).toBe(false);
    expect(controller.requestedRunId).toBeUndefined();
    expect(loadedRuns).toEqual([]);
  });

  it("lets only the latest trace list request through", () => {
    const first = controller.startListRequest();
    const second = controller.startListRequest("b");
    expect(controller.isLatestListRequest(first)).toBe(false);
    expect(controller.isLatestListRequest(second)).toBe(true);
    controller.endListRequest();
    expect(controller.requestedRunId).toBeUndefined();
  });

  it("lets only the latest trace request through", () => {
    const first = controller.startTraceRequest();
    const second = controller.startTraceRequest();
    expect(controller.isLatestTraceRequest(first)).toBe(false);
    expect(controller.isLatestTraceRequest(second)).toBe(true);
  });

  it("cancels a pending link when a run is picked, but not a refresh", () => {
    const link = controller.startListRequest("b");
    controller.cancelLinkRequest();
    expect(controller.isLatestListRequest(link)).toBe(false);

    const refresh = controller.startListRequest();
    controller.cancelLinkRequest();
    expect(controller.isLatestListRequest(refresh)).toBe(true);
  });

  it("writes the shown run into the current history entry", () => {
    history.replaceState(null, "", `${PATH}?run_id=a&more-info-entity-id=x`);
    const entries = history.length;
    controller.writeRunIdToUrl("c");
    const params = new URLSearchParams(location.search);
    expect(params.get("run_id")).toBe("c");
    expect(params.get("more-info-entity-id")).toBe("x");
    expect(history.length).toBe(entries);
  });

  it("leaves the URL of another page alone", () => {
    history.replaceState(null, "", "/config/script/dashboard");
    controller.writeRunIdToUrl("c");
    expect(location.pathname + location.search).toBe(
      "/config/script/dashboard"
    );
  });

  it("stops following the URL once the page is gone", () => {
    controller.hostDisconnected();
    navigate(`${PATH}?run_id=b`);
    expect(loadedRuns).toEqual([]);
  });

  describe("with an item id that needs encoding", () => {
    // The automation id "kitchen:lights", which the route decodes from any of
    // its encodings.
    let automation: TraceRunController;

    beforeEach(() => {
      automation = new TraceRunController(createHost(), {
        tracePath: () => "/config/automation/trace/kitchen%3Alights",
        shownRunId: () => "a",
        loadRun: (runId) => loadedRuns.push(runId),
      });
      automation.hostConnected();
    });

    afterEach(() => {
      automation.hostDisconnected();
    });

    it("follows links that encode the id differently or not at all", () => {
      navigate("/config/automation/trace/kitchen:lights?run_id=b");
      navigate("/config/automation/trace/kitchen%3alights?run_id=c");
      automation.writeRunIdToUrl("d");
      expect(loadedRuns).toEqual(["b", "c"]);
      expect(location.pathname + location.search).toBe(
        "/config/automation/trace/kitchen%3alights?run_id=d"
      );
    });

    it("ignores a path that cannot be decoded", () => {
      navigate("/config/automation/trace/kitchen%3?run_id=b");
      expect(loadedRuns).toEqual([]);
    });
  });
});
