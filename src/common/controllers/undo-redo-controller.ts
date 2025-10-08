import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";

const UNDO_REDO_STACK_LIMIT = 75;

/**
 * Configuration options for the UndoRedoController.
 *
 * @template ConfigType The type of configuration to manage.
 */
export interface UndoRedoControllerConfig<ConfigType> {
  stackLimit?: number;
  currentConfig: () => ConfigType;
  apply: (config: ConfigType) => void;
}

/**
 * A controller to manage undo and redo operations for a given configuration type.
 *
 * @template ConfigType The type of configuration to manage.
 */
export class UndoRedoController<ConfigType> implements ReactiveController {
  private _host: ReactiveControllerHost;

  private _undoStack: ConfigType[] = [];

  private _redoStack: ConfigType[] = [];

  private readonly _stackLimit: number = UNDO_REDO_STACK_LIMIT;

  private readonly _apply: (config: ConfigType) => void = () => {
    throw new Error("No apply function provided");
  };

  private readonly _currentConfig: () => ConfigType = () => {
    throw new Error("No currentConfig function provided");
  };

  constructor(
    host: ReactiveControllerHost,
    options: UndoRedoControllerConfig<ConfigType>
  ) {
    if (options.stackLimit !== undefined) {
      this._stackLimit = options.stackLimit;
    }

    this._apply = options.apply;
    this._currentConfig = options.currentConfig;
    this._host = host;
    host.addController(this);
  }

  hostConnected() {
    window.addEventListener("undo-change", this._onUndoChange);
  }

  hostDisconnected() {
    window.removeEventListener("undo-change", this._onUndoChange);
  }

  private _onUndoChange = (ev: Event) => {
    ev.stopPropagation();
    this.undo();
    this._host.requestUpdate();
  };

  /**
   * Indicates whether there are actions available to undo.
   *
   * @returns `true` if there are actions to undo, `false` otherwise.
   */
  public get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  /**
   * Indicates whether there are actions available to redo.
   *
   * @returns `true` if there are actions to redo, `false` otherwise.
   */
  public get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /**
   * Commits the current configuration to the undo stack and clears the redo stack.
   *
   * @param config The current configuration to commit.
   */
  public commit(config: ConfigType) {
    if (this._undoStack.length >= this._stackLimit) {
      this._undoStack.shift();
    }
    this._undoStack.push({ ...config });
    this._redoStack = [];
  }

  /**
   * Undoes the last action and applies the previous configuration
   * while saving the current configuration to the redo stack.
   */
  public undo() {
    if (this._undoStack.length === 0) {
      return;
    }
    this._redoStack.push({ ...this._currentConfig() });
    const config = this._undoStack.pop()!;
    this._apply(config);
    this._host.requestUpdate();
  }

  /**
   * Redoes the last undone action and reapplies the configuration
   * while saving the current configuration to the undo stack.
   */
  public redo() {
    if (this._redoStack.length === 0) {
      return;
    }
    this._undoStack.push({ ...this._currentConfig() });
    const config = this._redoStack.pop()!;
    this._apply(config);
    this._host.requestUpdate();
  }

  /**
   * Resets the undo and redo stacks, clearing all history.
   */
  public reset() {
    this._undoStack = [];
    this._redoStack = [];
  }
}

declare global {
  interface HASSDomEvents {
    "undo-change": undefined;
  }
}
