import type { ReactiveController, ReactiveControllerHost } from "lit";
import { replaceCurrentUrl } from "../common/navigate";

export interface TraceRunControllerOptions {
  /** Path of the trace page of the script or automation the host shows. */
  tracePath: () => string;
  /** The run the host shows. */
  shownRunId: () => string | undefined;
  /** Load the trace list and show this run. */
  loadRun: (runId: string) => void;
}

/**
 * Keeps a trace page in step with its URL. A link to another run of the same
 * script or automation, and browser back and forward between such runs, only
 * change the query string, which does not update the route, so the page has
 * to follow the URL itself. Requests are numbered, so a response that arrives
 * after a newer request, or after a run was picked, is dropped.
 */
export class TraceRunController implements ReactiveController {
  private readonly _options: TraceRunControllerOptions;

  private _listRequest = 0;

  private _traceRequest = 0;

  // The run the latest trace list request was asked for, while it loads.
  private _requestedRunId?: string;

  constructor(
    host: ReactiveControllerHost,
    options: TraceRunControllerOptions
  ) {
    this._options = options;
    host.addController(this);
  }

  /** The run a link asked for while its trace list is still loading. */
  public get requestedRunId(): string | undefined {
    return this._requestedRunId;
  }

  public hostConnected(): void {
    window.addEventListener("location-changed", this._syncRunFromUrl);
    window.addEventListener("popstate", this._syncRunFromUrl);
  }

  public hostDisconnected(): void {
    window.removeEventListener("location-changed", this._syncRunFromUrl);
    window.removeEventListener("popstate", this._syncRunFromUrl);
  }

  /** Start loading the trace list; `runId` is the run to show once it arrives. */
  public startListRequest(runId?: string): number {
    this._requestedRunId = runId;
    return ++this._listRequest;
  }

  /** Whether a later request, a picked run or a history step replaced it. */
  public isLatestListRequest(request: number): boolean {
    return request === this._listRequest;
  }

  /** The latest trace list arrived and its run is about to be shown. */
  public endListRequest(): void {
    this._requestedRunId = undefined;
  }

  public startTraceRequest(): number {
    return ++this._traceRequest;
  }

  public isLatestTraceRequest(request: number): boolean {
    return request === this._traceRequest;
  }

  /** A run picked on the page wins over a linked run that is still loading. */
  public cancelLinkRequest(): void {
    if (this._requestedRunId) {
      this._listRequest++;
      this._requestedRunId = undefined;
    }
  }

  /**
   * Put the shown run into the current history entry, without adding one, so
   * that browser history, reloads and the links between traces agree.
   */
  public writeRunIdToUrl(runId: string): void {
    const params = new URLSearchParams(location.search);
    if (
      location.pathname !== this._options.tracePath() ||
      params.get("run_id") === runId
    ) {
      return;
    }
    params.set("run_id", runId);
    replaceCurrentUrl(`${location.pathname}?${params.toString()}`);
  }

  // An entry without a run_id is left alone: closing a dialog with back lands
  // on one with the same URL.
  private _syncRunFromUrl = () => {
    const runId = new URLSearchParams(location.search).get("run_id");
    const shownRunId = this._options.shownRunId();
    if (
      !runId ||
      runId === (this._requestedRunId ?? shownRunId) ||
      location.pathname !== this._options.tracePath()
    ) {
      return;
    }
    if (runId === shownRunId) {
      // Back to the shown run before the requested one arrived.
      this.cancelLinkRequest();
      return;
    }
    this._options.loadRun(runId);
  };
}
