/**
 * Keeps a locally edited value from being overwritten by entity state updates
 * while the change is waiting to be sent or the service call is in flight.
 *
 * Call `schedule()` when the user changes the value and a (debounced) service
 * call is queued, wrap the service call in `run()`, and only copy entity state
 * into the local value when `shouldSync()` returns true. After a successful
 * call the local value is kept until the next state update syncs it. When the
 * call fails, the `resync` callback restores the entity state.
 *
 * Only the latest call is tracked, as it supersedes any earlier ones.
 */
export class PendingValueSync {
  private _scheduled = false;

  private _latestCall?: symbol;

  public get pending(): boolean {
    return this._scheduled || this._latestCall !== undefined;
  }

  /** Mark that a service call has been scheduled for a local change. */
  public schedule(): void {
    this._scheduled = true;
  }

  /**
   * Start over, e.g. when switching entities, so a pending change is not
   * shown for (or sent to) a different entity. Calls already in flight are
   * not aborted, but no longer block state updates or trigger `resync`.
   */
  public reset(): void {
    this._scheduled = false;
    this._latestCall = undefined;
  }

  /** Whether an entity state update may be copied into the local value. */
  public shouldSync(): boolean {
    return !this.pending;
  }

  /**
   * Run the service call for the scheduled change. If the latest call fails
   * and no new change is scheduled, `resync` is called. Errors are not
   * rethrown, as `callService` already notifies the user when the call fails.
   */
  public async run(
    call: () => Promise<unknown>,
    resync: () => void
  ): Promise<void> {
    const thisCall = Symbol("call");
    this._scheduled = false;
    this._latestCall = thisCall;
    let failed = false;
    try {
      await call();
    } catch (_err) {
      failed = true;
    }
    if (this._latestCall !== thisCall) {
      return;
    }
    this._latestCall = undefined;
    if (failed && !this._scheduled) {
      resync();
    }
  }
}
