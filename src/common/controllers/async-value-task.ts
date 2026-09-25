import { Task, type TaskConfig } from "@lit/task";
import type { ReactiveControllerHost } from "lit";

/**
 * A `@lit/task` Task with a sticky `resolved` flag: false until the task has
 * completed once, then true. Lets callers tell "still loading" apart from
 * "resolved with an empty value" without a null sentinel, while keeping the
 * previous value during a re-run.
 */
export class AsyncValueTask<T extends readonly unknown[], R> extends Task<
  T,
  R
> {
  private _resolved = false;

  constructor(host: ReactiveControllerHost, config: TaskConfig<T, R>) {
    super(host, {
      ...config,
      onComplete: (value) => {
        this._resolved = true;
        config.onComplete?.(value);
      },
    });
  }

  public get resolved(): boolean {
    return this._resolved;
  }
}
