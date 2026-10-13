/**
 * Keeps a locally edited value from being overwritten by entity state updates
 * while the change is waiting to be sent or the service call is in flight.
 *
 * Call `schedule()` when the user changes the value and a (debounced) service
 * call is queued, wrap the service call in `run()`, and only copy entity state
 * into the local value when `shouldSync()` returns true. State updates skipped
 * while pending are applied through the `resync` callback once nothing is
 * pending anymore.
 */
export class PendingValueSync {
  private _scheduled = false;

  private _inFlight = 0;

  private _needsResync = false;

  public get pending(): boolean {
    return this._scheduled || this._inFlight > 0;
  }

  /** Mark that a service call has been scheduled for a local change. */
  public schedule(): void {
    this._scheduled = true;
  }

  /**
   * Drop the scheduled change and any skipped state update, e.g. when
   * switching entities. Calls already in flight are still tracked.
   */
  public cancel(): void {
    this._scheduled = false;
    this._needsResync = false;
  }

  /**
   * Whether an entity state update may be copied into the local value.
   * A skipped update is remembered so it can be applied later.
   */
  public shouldSync(): boolean {
    if (this.pending) {
      this._needsResync = true;
      return false;
    }
    return true;
  }

  /**
   * Run the service call for the scheduled change. Once no change is
   * pending anymore, `resync` is called if a state update was skipped or the
   * call failed. Errors are not rethrown, as `callService` already notifies
   * the user when the call fails.
   */
  public async run(
    call: () => Promise<unknown>,
    resync: () => void
  ): Promise<void> {
    this._scheduled = false;
    this._inFlight++;
    try {
      await call();
    } catch (_err) {
      this._needsResync = true;
    } finally {
      this._inFlight--;
      if (!this.pending && this._needsResync) {
        this._needsResync = false;
        resync();
      }
    }
  }
}
