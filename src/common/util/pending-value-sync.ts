/**
 * Keeps a locally edited value from being overwritten by entity state updates
 * while the change is waiting to be sent or the service call is in flight.
 *
 * Call `schedule()` when the user changes the value and a (debounced) service
 * call is queued, wrap the service call in `run()`, and only copy entity state
 * into the local value when `shouldSync()` returns true. After a successful
 * call the local value is kept until the next state update syncs it. When the
 * call fails, the `resync` callback restores the entity state.
 */
export class PendingValueSync {
  private _scheduled = false;

  private _inFlight = 0;

  private _latestCall = 0;

  public get pending(): boolean {
    return this._scheduled || this._inFlight > 0;
  }

  /** Mark that a service call has been scheduled for a local change. */
  public schedule(): void {
    this._scheduled = true;
  }

  /**
   * Drop the scheduled change, e.g. when switching entities, so it is not
   * shown for (or sent to) a different entity. Calls already in flight are
   * still tracked.
   */
  public cancel(): void {
    this._scheduled = false;
  }

  /** Whether an entity state update may be copied into the local value. */
  public shouldSync(): boolean {
    return !this.pending;
  }

  /**
   * Run the service call for the scheduled change. If the latest call fails
   * and nothing else is pending, `resync` is called. Errors are not rethrown,
   * as `callService` already notifies the user when the call fails.
   */
  public async run(
    call: () => Promise<unknown>,
    resync: () => void
  ): Promise<void> {
    this._scheduled = false;
    const callId = ++this._latestCall;
    this._inFlight++;
    let failed = false;
    try {
      await call();
    } catch (_err) {
      failed = true;
    } finally {
      this._inFlight--;
      // A newer change supersedes the failed one.
      if (failed && callId === this._latestCall && !this.pending) {
        resync();
      }
    }
  }
}
