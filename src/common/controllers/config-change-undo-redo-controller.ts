import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import {
  applyConfigChanges,
  diffConfigs,
  invertConfigChanges,
  type ConfigChange,
} from "../util/config-change";
import { pathStartsWith, type ConfigPath } from "../util/config-path";
import { afterNextRender } from "../util/render-status";

const UNDO_REDO_STACK_LIMIT = 75;

/**
 * One undo step. `meta` is what the commit described the changes with, and
 * is missing for changes made without a commit.
 */
export interface ConfigChangeStep<Meta = unknown> {
  changes: ConfigChange[];
  meta?: Meta;
}

const changedPaths = (changes: ConfigChange[]): ConfigPath[] =>
  changes.flatMap((change) =>
    change.op === "move" ? [change.from, change.path] : [change.path]
  );

// Whether `changes` only touch values at, in or around the paths of `of`
const onlyTouches = (changes: ConfigChange[], of: ConfigChange[]) => {
  const paths = changedPaths(of);
  return changedPaths(changes).every((changed) =>
    paths.some(
      (path) => pathStartsWith(changed, path) || pathStartsWith(path, changed)
    )
  );
};

export interface ConfigChangeUndoRedoControllerConfig<ConfigType, Meta> {
  stackLimit?: number;
  currentConfig: () => ConfigType | undefined;
  /**
   * Applies the config after undo or redo, with the changes that led to it.
   * On undo these are the inverted changes of the step, in reverse order.
   */
  apply: (
    config: ConfigType,
    step: ConfigChangeStep<Meta>,
    undo: boolean
  ) => void;
  /** Called for every container copied while applying a change. */
  onCopy?: (original: object, copy: object) => void;
}

/**
 * Undo and redo for immutably updated configs. Instead of whole snapshots, each
 * step stores the changes that were made, with their paths, so the host can
 * point the user at what undo or redo touched.
 *
 * @template ConfigType The type of configuration to manage.
 * @template Meta Extra state stored with each step, e.g. UI state to restore.
 */
export class ConfigChangeUndoRedoController<
  ConfigType,
  Meta = undefined,
> implements ReactiveController {
  private _host: ReactiveControllerHost;

  private _undoStack: ConfigChangeStep<Meta>[] = [];

  private _redoStack: ConfigChangeStep<Meta>[] = [];

  private readonly _stackLimit: number = UNDO_REDO_STACK_LIMIT;

  private readonly _options: ConfigChangeUndoRedoControllerConfig<
    ConfigType,
    Meta
  >;

  // The config after the last commit, undo or redo
  private _lastConfig?: ConfigType;

  private _grouping = false;

  // The step commits add to until endGroup()
  private _groupStep?: ConfigChangeStep<Meta>;

  // Whether the last undo may still be answered by an editor putting back
  // what it removed
  private _undoPending = false;

  private _undoWithPreviousScheduled = false;

  constructor(
    host: ReactiveControllerHost,
    options: ConfigChangeUndoRedoControllerConfig<ConfigType, Meta>
  ) {
    if (options.stackLimit !== undefined) {
      this._stackLimit = options.stackLimit;
    }
    this._options = options;
    this._host = host;
    host.addController(this);
  }

  hostConnected() {
    window.addEventListener("undo-change", this._onUndoChange);
  }

  hostDisconnected() {
    window.removeEventListener("undo-change", this._onUndoChange);
    this._forgetUndo();
  }

  private _onUndoChange = (ev: Event) => {
    ev.stopPropagation();
    this.undo();
  };

  public get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /**
   * Records the difference between two configs and clears the redo stack.
   * Configs without a difference are not recorded. `describe` is called with
   * all changes of the step, to store state about them with it.
   */
  public commit(
    before: ConfigType,
    after: ConfigType,
    describe?: (changes: ConfigChange[]) => Meta
  ) {
    // An editor put back what the last undo removed, e.g. defaults it fills
    // in, maybe in several commits. That step can't be undone on its own, so
    // it is undone together with the one before it.
    const undone = this._redoStack[this._redoStack.length - 1];
    if (
      this._undoPending &&
      undone &&
      before === this._lastConfig &&
      onlyTouches(diffConfigs(before, after), undone.changes)
    ) {
      this._lastConfig = after;
      this._scheduleUndoWithPrevious(undone);
      return;
    }
    this._forgetUndo();
    this._syncExternalChanges(before);
    this._lastConfig = after;
    this._record(before, after, describe);
  }

  public undo() {
    const current = this._options.currentConfig();
    this._syncExternalChanges(current);
    const step = this._undoStack.pop();
    if (!step || current === undefined) {
      return;
    }
    this._redoStack.push(step);
    this._rememberUndo();
    this._applyStep(
      current,
      { changes: invertConfigChanges(step.changes), meta: step.meta },
      true
    );
  }

  public redo() {
    this._forgetUndo();
    const current = this._options.currentConfig();
    this._syncExternalChanges(current);
    const step = this._redoStack.pop();
    if (!step || current === undefined) {
      return;
    }
    this._undoStack.push(step);
    this._applyStep(current, step, false);
  }

  /**
   * Records the commits until `endGroup()` as one step, e.g. for a drag
   * between two lists, which report their changes one after the other.
   */
  public startGroup() {
    this._grouping = true;
    this._groupStep = undefined;
  }

  public endGroup() {
    this._grouping = false;
    this._groupStep = undefined;
  }

  public reset() {
    this._undoStack = [];
    this._redoStack = [];
    this._host.requestUpdate();
  }

  /**
   * Records a change made without a commit, e.g. in the YAML editor or a
   * dialog, as its own step. Without it, later undo steps would replay on a
   * config they weren't recorded on and could hit another row.
   */
  private _syncExternalChanges(config: ConfigType | undefined) {
    const last = this._lastConfig;
    this._lastConfig = config;
    if (config === last || config === undefined || last === undefined) {
      return;
    }
    this._record(last, config);
  }

  private _record(
    before: ConfigType,
    after: ConfigType,
    describe?: (changes: ConfigChange[]) => Meta
  ) {
    const changes = diffConfigs(before, after);
    if (!changes.length) {
      return;
    }
    const group = this._groupStep;
    if (group && group === this._undoStack[this._undoStack.length - 1]) {
      group.changes = [...group.changes, ...changes];
      if (describe) {
        group.meta = describe(group.changes);
      }
    } else {
      if (this._undoStack.length >= this._stackLimit) {
        this._undoStack.shift();
      }
      const step = { changes, meta: describe?.(changes) };
      this._undoStack.push(step);
      if (this._grouping) {
        this._groupStep = step;
      }
    }
    this._redoStack = [];
    this._host.requestUpdate();
  }

  // Editors put defaults back on their own. Anything after the user's next
  // input is a change of their own, even if it puts the same value back.
  private _rememberUndo() {
    this._forgetUndo();
    this._undoPending = true;
    window.addEventListener("pointerdown", this._forgetUndo, true);
    window.addEventListener("keydown", this._forgetUndo, true);
  }

  private _forgetUndo = () => {
    this._undoPending = false;
    window.removeEventListener("pointerdown", this._forgetUndo, true);
    window.removeEventListener("keydown", this._forgetUndo, true);
  };

  // Waits until the editors rendered the undo. One still updating could
  // otherwise write an old value back while the next undo runs.
  private _scheduleUndoWithPrevious(step: ConfigChangeStep<Meta>) {
    if (this._undoWithPreviousScheduled) {
      return;
    }
    this._undoWithPreviousScheduled = true;
    afterNextRender(() => {
      this._undoWithPreviousScheduled = false;
      // Another undo or redo came first
      if (this._redoStack[this._redoStack.length - 1] !== step) {
        return;
      }
      this._redoStack.pop();
      const previous = this._undoStack.pop();
      if (!previous) {
        this._host.requestUpdate();
        return;
      }
      this._undoStack.push({
        changes: [...previous.changes, ...step.changes],
        meta: previous.meta,
      });
      this.undo();
    });
  }

  private _applyStep(
    current: ConfigType,
    step: ConfigChangeStep<Meta>,
    undo: boolean
  ) {
    const config = applyConfigChanges(
      current,
      step.changes,
      this._options.onCopy
    );
    this._lastConfig = config;
    this._options.apply(config, step, undo);
    this._host.requestUpdate();
  }
}

declare global {
  interface HASSDomEvents {
    "undo-change": undefined;
  }
}
