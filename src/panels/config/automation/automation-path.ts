import { ContextProvider, createContext } from "@lit/context";
import type { ReactiveElement } from "lit";
import {
  consumeContext,
  ContextController,
} from "../../../common/decorators/consume";
import {
  pathEquals,
  stringifyPath,
  type ConfigPath,
} from "../../../common/util/config-path";

export const automationPathContext =
  createContext<ConfigPath>("automation-path");

export interface AutomationPathRow extends HTMLElement {
  readonly selected: boolean;
  openSidebar(): void;
  expand(): void;
}

const owner = (rows?: AutomationPathRow[]) => rows?.[rows.length - 1];

/**
 * Rows that open in the sidebar, by path. Lets the editor find the row a
 * config path belongs to, e.g. to show it or point at an error in it.
 */
export class AutomationRowRegistry {
  // Rows claiming each path, the latest one owns it. While a row is dragged
  // over another list it claims the path of a row there, which takes the path
  // back once the dragged row leaves.
  private _rows = new Map<
    string,
    { path: ConfigPath; rows: AutomationPathRow[] }
  >();

  public register(path: ConfigPath, row: AutomationPathRow) {
    const key = stringifyPath(path);
    const entry = this._rows.get(key);
    if (!entry) {
      this._rows.set(key, { path, rows: [row] });
      return;
    }
    entry.rows = [...entry.rows.filter((claimed) => claimed !== row), row];
  }

  public unregister(path: ConfigPath, row: AutomationPathRow) {
    const key = stringifyPath(path);
    const entry = this._rows.get(key);
    if (!entry) {
      return;
    }
    entry.rows = entry.rows.filter((claimed) => claimed !== row);
    if (!entry.rows.length) {
      this._rows.delete(key);
    }
  }

  public pathOf(row: AutomationPathRow): ConfigPath | undefined {
    return [...this._rows.values()].find((entry) => owner(entry.rows) === row)
      ?.path;
  }

  /** The rows containing `path`, outermost first. */
  public rowsAlong(path: ConfigPath): AutomationPathRow[] {
    return path
      .map((_segment, index) =>
        owner(this._rows.get(stringifyPath(path.slice(0, index + 1)))?.rows)
      )
      .filter((row): row is AutomationPathRow => row !== undefined);
  }
}

export const automationRowRegistryContext =
  createContext<AutomationRowRegistry>("automation-row-registry");

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

  // The path is not rendered, so a changed ancestor path is passed on without
  // updating the host. Only the host's own segment changes go through an update.
  protected contextUpdated() {
    this._sync();
  }

  public hostUpdate() {
    this._sync();
  }

  public hostConnected() {
    // A row moved by a drag reconnects without an update
    this._sync();
  }

  private _sync() {
    const path = [...this._parentPath, ...this._options.segment()];
    if (!pathEquals(path, this.path)) {
      this.path = path;
      this._provider.setValue(path);
    }
    this._syncRegistration();
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
