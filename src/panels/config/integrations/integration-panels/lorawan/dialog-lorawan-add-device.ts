import type { ContextType } from "@lit/context";
import { mdiClose, mdiOpenInNew } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-button-prev";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/item/ha-list-item-button";
import "../../../../../components/list/ha-list-nav";
import {
  connectionContext,
  internationalizationContext,
  uiContext,
} from "../../../../../data/context";
import type { LoRaWANConnection } from "../../../../../data/lorawan";
import { DialogMixin } from "../../../../../dialogs/dialog-mixin";
import { brandsUrl } from "../../../../../util/brands-url";

@customElement("dialog-lorawan-add-device")
class DialogLoRaWANAddDevice extends DialogMixin<{
  connections: LoRaWANConnection[];
}>(LitElement) {
  @state() private _selected?: LoRaWANConnection;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  private _ui!: ContextType<typeof uiContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  protected render() {
    if (!this.params) return nothing;
    const selected = this._selected;
    return html`<ha-dialog
      open
      type="alert"
      class=${selected ? "" : "connection-picker"}
      .headerTitle=${this._i18n.localize(
        selected
          ? "ui.panel.config.lorawan.add_device"
          : "ui.panel.config.lorawan.add_device_dialog.choose_connection"
      )}
      .headerSubtitle=${selected?.title}
    >
      ${selected ? html`<ha-icon-button-prev slot="headerNavigationIcon" .label=${this._i18n.localize("ui.common.back")} @click=${this._back}></ha-icon-button-prev>` : html`<span slot="headerNavigationIcon"></span>`}
      <ha-icon-button
        slot="headerActionItems"
        .path=${mdiClose}
        .label=${this._i18n.localize("ui.common.close")}
        @click=${this.closeDialog}
      ></ha-icon-button>
      ${
        selected
          ? html`<p>
              ${this._i18n.localize(
                selected.configuration_url
                  ? "ui.panel.config.lorawan.add_device_dialog.instructions"
                  : "ui.panel.config.lorawan.add_device_dialog.no_console"
              )}
            </p>`
          : html`
              <ha-list-nav
                .ariaLabel=${this._i18n.localize("ui.panel.config.lorawan.connection")}
              >
                ${this.params.connections.map(
                  (connection) =>
                    html`<ha-list-item-button
                      .connection=${connection}
                      @click=${this._selectConnection}
                    >
                      <img
                        slot="start"
                        alt=""
                        width="32"
                        height="32"
                        src=${brandsUrl({ domain: connection.domain, type: "icon", darkOptimized: this._ui.themes.darkMode }, this._connection.hassUrl())}
                      />
                      <span slot="headline">${connection.title}</span>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>`
                )}
              </ha-list-nav>
            `
      }
      ${
        selected?.configuration_url
          ? html`<ha-dialog-footer slot="footer">
              <a
                slot="primaryAction"
                href=${selected.configuration_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                ${this._i18n.localize("ui.panel.config.lorawan.add_device_dialog.open_console")}
                <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
              </a>
            </ha-dialog-footer>`
          : nothing
      }
    </ha-dialog>`;
  }

  private _selectConnection(
    ev: HASSDomCurrentTargetEvent<
      HTMLElement & { connection: LoRaWANConnection }
    >
  ) {
    this._selected = ev.currentTarget.connection;
  }

  private _back() {
    this._selected = undefined;
  }

  static styles = css`
    .connection-picker {
      --dialog-content-padding: 0;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-2);
      color: var(--primary-color);
    }
    a ha-svg-icon {
      --mdc-icon-size: 18px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lorawan-add-device": DialogLoRaWANAddDevice;
  }
}
