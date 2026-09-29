import { fireEvent } from "../common/dom/fire_event";
import type { ShowDialogParams } from "../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../types";

export interface DashboardActionContext {
  hass: HomeAssistant;
  host: HTMLElement;
  path: string;
  showDialog: (options: ShowDialogParams<unknown>) => Promise<void>;
}

/** An action contributed by an already loaded dashboard resource. */
export interface DashboardAction {
  id: `${string}:${string}`;
  icon: string;
  label: (context: DashboardActionContext) => string;
  visible?: (context: DashboardActionContext) => boolean;
  execute: (context: DashboardActionContext) => void | Promise<void>;
}

export interface ResolvedDashboardAction {
  action: DashboardAction;
  label: string;
}

export class DashboardActions {
  private _actions = new Map<string, DashboardAction>();

  private _listeners = new Set<() => void>();

  private _failedActions = new WeakSet<DashboardAction>();

  /** Replaces the same namespaced ID. Disposing an old registration is harmless. */
  public register(action: DashboardAction): () => void {
    if (!/^[a-z][a-z0-9_]*:[a-z][a-z0-9_-]*$/.test(action.id)) {
      throw new Error("Dashboard actions require a namespaced ID");
    }
    if (
      !action.icon.startsWith("mdi:") ||
      typeof action.execute !== "function"
    ) {
      throw new Error("Dashboard actions require an MDI icon and an action");
    }
    const registered = Object.freeze({ ...action });
    this._actions.set(registered.id, registered);
    this._notify();
    return () => {
      if (this._actions.get(registered.id) !== registered) return;
      this._actions.delete(registered.id);
      this._notify();
    };
  }

  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  public resolve(context: DashboardActionContext): ResolvedDashboardAction[] {
    const result: ResolvedDashboardAction[] = [];
    for (const action of this._actions.values()) {
      try {
        if (action.visible && !action.visible(context)) {
          this._failedActions.delete(action);
          continue;
        }
        const label = action.label(context);
        if (label) result.push({ action, label });
        this._failedActions.delete(action);
      } catch (error) {
        // A broken resource must not prevent built-in dashboard actions rendering.
        if (!this._failedActions.has(action)) {
          this._failedActions.add(action);
          fireEvent(context.host, "write_log", {
            message: `Error resolving dashboard action ${action.id}: ${String(error)}`,
          });
        }
      }
    }
    return result;
  }

  private _notify(): void {
    for (const listener of this._listeners) listener();
  }
}

export const dashboardActions = new DashboardActions();

declare global {
  interface Window {
    customDashboardActions: Pick<DashboardActions, "register">;
  }
}
