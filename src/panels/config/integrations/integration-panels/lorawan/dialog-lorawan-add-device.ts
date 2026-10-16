import type { ContextType } from "@lit/context";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-icon-next";
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
      .headerTitle=${this._i18n.localize("ui.panel.config.lorawan.add_device")}
      .headerSubtitle=${selected?.title}
    >
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
              <p>
                ${this._i18n.localize("ui.panel.config.lorawan.add_device_dialog.choose_connection")}
              </p>
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
        selected
          ? html`<ha-dialog-footer slot="footer">
              <ha-button
                slot="secondaryAction"
                appearance="plain"
                @click=${this._back}
                >${this._i18n.localize("ui.common.back")}</ha-button
              >
              ${selected.configuration_url ? html`<ha-button slot="primaryAction" href=${selected.configuration_url} target="_blank" rel="noopener noreferrer">${this._i18n.localize("ui.panel.config.lorawan.add_device_dialog.open_console")}</ha-button>` : nothing}
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
    ha-button[slot="secondaryAction"] {
      margin-inline-end: auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lorawan-add-device": DialogLoRaWANAddDevice;
  }
}
