import type { LitElement } from "lit";
import type { Constructor } from "../types";

export const UndoRedoMixin = <T extends Constructor<LitElement>, ConfigType>(
  superClass: T
) => {
  class UndoRedoClass extends superClass {
    private _undoStack: ConfigType[] = [];

    private _redoStack: ConfigType[] = [];

    protected pushToUndo(config: ConfigType) {
      this._undoStack.push({ ...config });
      this._redoStack = [];
    }

    public undo() {
      const _currentConfig = this.currentConfig;
      if (this._undoStack.length === 0 || !_currentConfig) {
        return;
      }
      this._redoStack.push({ ..._currentConfig });
      const config = this._undoStack.pop()!;
      this.applyUndoRedo(config);
    }

    public redo() {
      const _currentConfig = this.currentConfig;
      if (this._redoStack.length === 0 || !_currentConfig) {
        return;
      }
      this._undoStack.push({ ..._currentConfig });
      const config = this._redoStack.pop()!;
      this.applyUndoRedo(config);
    }

    public get canUndo(): boolean {
      return this._undoStack.length > 0;
    }

    public get canRedo(): boolean {
      return this._redoStack.length > 0;
    }

    protected get currentConfig(): ConfigType | undefined {
      return undefined;
    }

    protected applyUndoRedo(_: ConfigType) {
      throw new Error("applyUndoRedo not implemented");
    }
  }

  return UndoRedoClass;
};
