import { ContextProvider, createContext } from "@lit/context";
import type { ReactiveElement } from "lit";
import {
  consumeContext,
  ContextController,
} from "../../../common/decorators/consume";
import type { ConfigChangeStep } from "../../../common/controllers/config-change-undo-redo-controller";
import type { ConfigChange } from "../../../common/util/config-change";
import { deepEqual } from "../../../common/util/deep-equal";
import { pathEquals, type ConfigPath } from "../../../common/util/config-path";

export const automationPathContext =
  createContext<ConfigPath>("automation-path");

export interface AutomationPathRow extends HTMLElement {
  readonly selected: boolean;
  openSidebar(): void;
  expand(): void;
}

const pathKey = (path: ConfigPath) => path.join("/");

/**
 * Rows that open in the sidebar, by path. Lets the editor find the row a
 * change belongs to after undo or redo.
 */
export class AutomationRowRegistry {
  private _rows = new Map<
    string,
    { path: ConfigPath; row: AutomationPathRow }
  >();

  public register(path: ConfigPath, row: AutomationPathRow) {
    this._rows.set(pathKey(path), { path, row });
  }

  public unregister(path: ConfigPath, row: AutomationPathRow) {
    const key = pathKey(path);
    // A reordered row may already have taken over the path.
    if (this._rows.get(key)?.row === row) {
      this._rows.delete(key);
    }
  }

  public pathOf(row: AutomationPathRow): ConfigPath | undefined {
    return [...this._rows.values()].find((entry) => entry.row === row)?.path;
  }

  /** The rows containing `path`, outermost first. */
  public rowsAlong(path: ConfigPath): AutomationPathRow[] {
    return path
      .map(
        (_segment, index) =>
          this._rows.get(pathKey(path.slice(0, index + 1)))?.row
      )
      .filter((row): row is AutomationPathRow => row !== undefined);
  }
}

export const automationRowRegistryContext =
  createContext<AutomationRowRegistry>("automation-row-registry");

/**
 * Paths of the rows changes are about, most likely first. A removed row is
 * pointed at by its list.
 */
export const getChangedRowPaths = (changes: ConfigChange[]): ConfigPath[] =>
  changes.flatMap((change) => {
    if (change.op === "remove") {
      return [change.path.slice(0, -1)];
    }
    // Empty optional lists like "else" are removed from the config, so a
    // list that came back is about its rows
    if (change.op === "add" && Array.isArray(change.value)) {
      return [[...change.path, 0], change.path];
    }
    // A replaced list, e.g. after pasting several rows, is about its first
    // changed row
    if (
      change.op === "replace" &&
      Array.isArray(change.before) &&
      Array.isArray(change.after)
    ) {
      const { before, after } = change;
      const index = after.findIndex((item, i) => !deepEqual(item, before[i]));
      return index === -1
        ? [change.path]
        : [[...change.path, index], change.path];
    }
    if (change.op !== "move") {
      return [change.path];
    }
    const from = change.from[change.from.length - 1] as number;
    const to = change.path[change.path.length - 1] as number;
    // Swapped neighbours can't be told apart
    return Math.abs(from - to) === 1 &&
      pathEquals(change.from.slice(0, -1), change.path.slice(0, -1))
      ? [change.path, change.from]
      : [change.path];
  });

/** Editor state stored with each undo step. */
export interface UndoStepMeta {
  /**
   * Path of the row the sidebar showed, when the change was about it: before
   * the change, to show after undo, and after it, to show after redo.
   */
  sidebarRow?: { undo: ConfigPath; redo?: ConfigPath };
}

/**
 * The rows to show after undo or redo. The sidebar opens only for a change
 * that was made while the sidebar showed its row.
 */
export const getUndoRevealTarget = (
  { changes, meta }: ConfigChangeStep<UndoStepMeta>,
  undo: boolean
): { paths: ConfigPath[]; openSidebar: boolean } => {
  const sidebarPath = undo ? meta?.sidebarRow?.undo : meta?.sidebarRow?.redo;
  return sidebarPath
    ? { paths: [sidebarPath], openSidebar: true }
    : { paths: getChangedRowPaths(changes), openSidebar: false };
};

interface AutomationPathControllerOptions {
  /** Path segments this element adds to the path of its ancestor. */
  segment: () => ConfigPath;
  /** The host while it is a row that opens in the sidebar. */
  row?: () => AutomationPathRow | undefined;
}

/**
 * Consumes the path of the closest ancestor and provides it extended by the
 * host's own segment to its descendants.
 */
export class AutomationPathController extends ContextController {
  public path: ConfigPath = [];

  @consumeContext({ context: automationPathContext, subscribe: true })
  private _parentPath: ConfigPath = [];

  @consumeContext({ context: automationRowRegistryContext })
  private _registry?: AutomationRowRegistry;

  private _registeredPath?: ConfigPath;

  private _registeredRow?: AutomationPathRow;

  private readonly _provider: ContextProvider<typeof automationPathContext>;

  constructor(
    host: ReactiveElement,
    private readonly _options: AutomationPathControllerOptions
  ) {
    super(host);
    this._provider = new ContextProvider(host, {
      context: automationPathContext,
      initialValue: this.path,
    });
  }

  protected contextUpdated() {
    this.host.requestUpdate();
  }

  public hostUpdate() {
    const path = [...this._parentPath, ...this._options.segment()];
    if (!pathEquals(path, this.path)) {
      this.path = path;
      this._provider.setValue(path);
    }
    this._syncRegistration();
  }

  public hostConnected() {
    // A row put back by a cancelled drag reconnects without an update
    this.host.requestUpdate();
  }

  public hostDisconnected() {
    this._unregister();
  }

  private _syncRegistration() {
    if (!this._registry || !this._options.row) {
      return;
    }
    const row = this.host.isConnected ? this._options.row() : undefined;
    if (
      this._registeredPath &&
      (!row || !pathEquals(this._registeredPath, this.path))
    ) {
      this._unregister();
    }
    if (row && !this._registeredPath) {
      this._registry.register(this.path, row);
      this._registeredPath = this.path;
      this._registeredRow = row;
    }
  }

  private _unregister() {
    if (this._registeredPath && this._registeredRow) {
      this._registry?.unregister(this._registeredPath, this._registeredRow);
    }
    this._registeredPath = undefined;
    this._registeredRow = undefined;
  }
}
