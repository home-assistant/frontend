import type { LitElement } from "lit";
import type { Constructor } from "../types";

export const UndoRedoMixin = <T extends Constructor<LitElement>, ConfigType>(
  superClass: T
) => {
  class UndoRedoClass extends superClass {
    private _undoStack: ConfigType[] = [];

    private _redoStack: ConfigType[] = [];

    protected _undoStackLimit = 75;

    protected pushToUndo(config: ConfigType) {
      if (this._undoStack.length >= this._undoStackLimit) {
        this._undoStack.shift();
      }
      this._undoStack.push({ ...config });
      this._redoStack = [];
    }

    public undo() {
      const currentConfig = this.currentConfig;
      if (this._undoStack.length === 0 || !currentConfig) {
        return;
      }
      this._redoStack.push({ ...currentConfig });
      const config = this._undoStack.pop()!;
      this.applyUndoRedo(config);
    }

    public redo() {
      const currentConfig = this.currentConfig;
      if (this._redoStack.length === 0 || !currentConfig) {
        return;
      }
      this._undoStack.push({ ...currentConfig });
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
