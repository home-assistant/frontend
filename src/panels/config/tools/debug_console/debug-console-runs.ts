export interface DebugConsoleRun {
  id: number;
  code: string;
}

/**
 * The code a console is running. Runs go on side by side, like in the console
 * of a web browser, so code that waits does not hold up the next.
 */
export class DebugConsoleRuns {
  public pending: DebugConsoleRun[] = [];

  private _nextId = 0;

  // Bumped by clearing the log, so runs started before it do not refill it.
  private _generation = 0;

  constructor(private readonly _changed: () => void) {}

  /**
   * Run code, and return its result, or nothing when the log got cleared in
   * the meantime.
   */
  public async run<T>(
    code: string,
    execute: (code: string) => Promise<T>
  ): Promise<T | undefined> {
    const run = { id: this._nextId++, code };
    const generation = this._generation;
    this.pending = [...this.pending, run];
    this._changed();

    try {
      const result = await execute(code);
      return generation === this._generation ? result : undefined;
    } finally {
      this.pending = this.pending.filter((pending) => pending !== run);
      this._changed();
    }
  }

  /** Forget the results of runs still going, as the log they belong to is gone. */
  public clear() {
    this._generation++;
  }
}
