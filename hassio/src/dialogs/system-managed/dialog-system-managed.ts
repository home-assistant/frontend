import { mdiClose, mdiPuzzle, mdiSwapHorizontal } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { atLeastVersion } from "../../../../src/common/config/version";
import "../../../../src/components/ha-dialog-header";
import "../../../../src/components/ha-icon-button";
import "../../../../src/components/ha-icon-next";
import "../../../../src/components/ha-md-dialog";
import type { HaMdDialog } from "../../../../src/components/ha-md-dialog";
import "../../../../src/components/ha-md-list";
import "../../../../src/components/ha-md-list-item";
import "../../../../src/components/ha-svg-icon";
import {
  getConfigEntry,
  type ConfigEntry,
} from "../../../../src/data/config_entries";
import type { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { mdiHomeAssistant } from "../../../../src/resources/home-assistant-logo-svg";
import { haStyle } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { brandsUrl } from "../../../../src/util/brands-url";
import type { SystemManagedDialogParams } from "./show-dialog-system-managed";

@customElement("dialog-system-managed")
class HassioSystemManagedDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _supervisor?: Supervisor;

  @state() private _addon?: HassioAddonDetails;

  @state() private _open = false;

  @state() private _configEntry?: ConfigEntry;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(
    dialogParams: SystemManagedDialogParams
  ): Promise<void> {
    this._addon = dialogParams.addon;
    this._supervisor = dialogParams.supervisor;
    this._open = true;
    this._loadConfigEntry();
  }

  private _dialogClosed() {
    this._addon = undefined;
    this._supervisor = undefined;
    this._configEntry = undefined;
    this._open = false;
  }

  public closeDialog() {
    this._dialog?.close();
    return true;
  }

  protected render() {
    if (!this._addon || !this._open || !this._supervisor) {
      return nothing;
    }

    const addonImage =
      atLeastVersion(this.hass.config.version, 0, 105) && this._addon.icon
        ? `/api/hassio/addons/${this._addon.slug}/icon`
        : undefined;

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title">${this._addon?.name}</span>
        </ha-dialog-header>
        <div slot="content">
          <div class="icons">
            <ha-svg-icon
              class="primary"
              .path=${mdiHomeAssistant}
            ></ha-svg-icon>
            <ha-svg-icon .path=${mdiSwapHorizontal}></ha-svg-icon>
            ${addonImage
              ? html`<img src=${addonImage} alt=${this._addon.name} />`
              : html`<ha-svg-icon .path=${mdiPuzzle}></ha-svg-icon>`}
          </div>
          ${this._supervisor.localize("addon.system_managed.title")}.<br />
          ${this._supervisor.localize("addon.system_managed.description")}
          ${this._configEntry
            ? html`
                <h3>
                  ${this._supervisor.localize(
                    "addon.system_managed.managed_by"
                  )}:
                </h3>
                <ha-md-list>
                  <ha-md-list-item
                    type="link"
                    href=${`/config/integrations/integration/${this._configEntry.domain}`}
                  >
                    <img
                      slot="start"
                      class="integration-icon"
                      alt=${this._configEntry.title}
                      src=${brandsUrl({
                        domain: this._configEntry.domain,
                        type: "icon",
                        darkOptimized: this.hass.themes?.darkMode,
                      })}
                      crossorigin="anonymous"
                      referrerpolicy="no-referrer"
                      @error=${this._onImageError}
                      @load=${this._onImageLoad}
                    />
                    ${this._configEntry.title}
                    <ha-icon-next slot="end"></ha-icon-next>
                  </ha-md-list-item>
                </ha-md-list>
              `
            : nothing}
        </div>
      </ha-md-dialog>
    `;
  }

  private _onImageLoad(ev) {
    ev.target.style.visibility = "initial";
  }

  private _onImageError(ev) {
    ev.target.style.visibility = "hidden";
  }

  private async _loadConfigEntry() {
    if (this._addon?.system_managed_config_entry) {
      try {
        const { config_entry } = await getConfigEntry(
          this.hass,
          this._addon.system_managed_config_entry
        );
        this._configEntry = config_entry;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .icons {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--ha-space-4);
          --mdc-icon-size: 48px;
          margin-bottom: 32px;
        }
        .icons img {
          width: 48px;
        }
        .icons .primary {
          color: var(--primary-color);
        }
        .actions {
          display: flex;
          justify-content: space-between;
        }
        .integration-icon {
          width: 24px;
        }
        ha-md-list-item {
          --md-list-item-leading-space: 4px;
          --md-list-item-trailing-space: 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-system-managed": HassioSystemManagedDialog;
  }
}
