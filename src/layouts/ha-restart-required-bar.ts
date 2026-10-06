import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { transform } from "../common/decorators/transform";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-alert";
import "../components/ha-button";
import {
  configContext,
  connectionContext,
  narrowViewportContext,
  uiContext,
} from "../data/context";
import { domainToName } from "../data/integration";
import type { SystemState } from "../data/system_state";
import { dismissSystemState, subscribeSystemState } from "../data/system_state";
import { showRestartDialog } from "../dialogs/restart/show-dialog-restart";
import type {
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantUI,
} from "../types";

declare global {
  interface HASSDomEvents {
    "restart-required-bar-resized": { height: number };
  }
}

@customElement("ha-restart-required-bar")
class HaRestartRequiredBar extends LitElement {
  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, string>({
    transformer: ({ panelUrl }) => panelUrl,
  })
  private _panelUrl!: string;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean>({
    transformer: ({ kioskMode }) => kioskMode,
  })
  private _kioskMode = false;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, boolean>({
    transformer: ({ user }) => Boolean(user?.is_admin),
  })
  private _isAdmin = false;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection?: Connection;

  @state()
  @consume({ context: narrowViewportContext, subscribe: true })
  private _narrow = false;

  @state() private _systemState?: SystemState;

  private _resizeObserver = new ResizeObserver(() => this._reportHeight());

  private _unsubSystemState?: UnsubscribeFunc;

  public connectedCallback() {
    super.connectedCallback();
    this._resizeObserver.observe(this);
    this._subscribe();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver.disconnect();
    this._unsubscribe();
  }

  protected render() {
    const systemState = this._systemState;
    if (!systemState || !this._isVisible(systemState)) {
      return nothing;
    }

    // A reboot restarts Home Assistant as well, so it takes priority.
    const reboot = systemState.host_reboot_required;
    const inSettings = this._inSettings;
    // The integrations asked for a restart, not for the reboot, so they are
    // only listed while the restart is what is shown.
    const sources = systemState.home_assistant_restart_sources.map((domain) =>
      domainToName(this._localize, domain)
    );

    return html`
      <ha-alert alert-type="warning" .narrow=${this._narrow}>
        ${this._localize(
          reboot
            ? "ui.restart_required.reboot_message"
            : "ui.restart_required.restart_message"
        )}
        ${
          inSettings && !reboot && sources.length
            ? html`<div class="sources">
                ${this._localize("ui.restart_required.sources", {
                  integrations: sources.join(", "),
                })}
              </div>`
            : nothing
        }
        <div class="actions" slot="action">
          ${
            inSettings
              ? nothing
              : html`<ha-button
                  appearance="plain"
                  size="s"
                  variant="warning"
                  @click=${this._dismiss}
                >
                  ${this._localize("ui.restart_required.later")}
                </ha-button>`
          }
          <ha-button size="s" variant="warning" @click=${this._restart}>
            ${this._localize(
              reboot
                ? "ui.restart_required.reboot"
                : "ui.restart_required.restart"
            )}
          </ha-button>
        </div>
      </ha-alert>
    `;
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("_connection") || changedProps.has("_isAdmin")) {
      this._unsubscribe();
      this._subscribe();
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    this.toggleAttribute(
      "active",
      Boolean(this._systemState && this._isVisible(this._systemState))
    );
    this._reportHeight();
  }

  private _subscribe() {
    if (this._unsubSystemState || !this._connection || !this._isAdmin) {
      return;
    }
    this._unsubSystemState = subscribeSystemState(
      this._connection,
      (systemState) => {
        this._systemState = systemState;
      }
    );
  }

  private _unsubscribe() {
    this._unsubSystemState?.();
    this._unsubSystemState = undefined;
  }

  // Settings is where you take care of it, so it cannot be put off there.
  private get _inSettings(): boolean {
    return this._panelUrl === "config";
  }

  private _isVisible(systemState: SystemState): boolean {
    if (!this._isAdmin || this._kioskMode) {
      return false;
    }
    if (
      !systemState.host_reboot_required &&
      !systemState.home_assistant_restart_required
    ) {
      return false;
    }
    return this._inSettings || !this._isDismissed(systemState);
  }

  // Core keeps track of what an admin put off, for everyone on every device.
  private _isDismissed(systemState: SystemState): boolean {
    return systemState.host_reboot_required
      ? systemState.host_reboot_dismissed
      : systemState.home_assistant_restart_dismissed;
  }

  private _dismiss() {
    dismissSystemState(this._connection!);
  }

  private _restart() {
    showRestartDialog(this);
  }

  private _reportHeight() {
    fireEvent(this, "restart-required-bar-resized", {
      height: this.offsetHeight,
    });
  }

  static styles = css`
    :host {
      display: none;
    }
    :host([active]) {
      display: block;
      position: fixed;
      top: 0;
      inset-inline-start: var(--ha-sidebar-width, 0px);
      width: var(--ha-top-app-bar-width, 100%);
      /* Above the fixed headers of the panels. */
      z-index: 5;
      box-sizing: border-box;
      padding-top: var(--safe-area-inset-top);
      padding-inline-end: var(--safe-area-inset-right);
      background-color: var(--primary-background-color);
    }
    ha-alert {
      display: block;
      --ha-border-radius-sm: 0;
    }
    .sources {
      margin-top: var(--ha-space-1, 4px);
      color: var(--secondary-text-color);
    }
    .actions {
      display: flex;
      gap: var(--ha-space-2, 8px);
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-restart-required-bar": HaRestartRequiredBar;
  }
}
