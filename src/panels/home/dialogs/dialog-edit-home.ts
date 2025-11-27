import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-wa-dialog";
import type { HomeFrontendSystemData } from "../../../data/frontend";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { EditHomeDialogParams } from "./show-dialog-edit-home";

@customElement("dialog-edit-home")
export class DialogEditHome
  extends LitElement
  implements HassDialog<EditHomeDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EditHomeDialogParams;

  @state() private _config?: HomeFrontendSystemData;

  @state() private _open = false;

  @state() private _submitting = false;

  public showDialog(params: EditHomeDialogParams): void {
    this._params = params;
    this._config = { ...params.config };
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._config = undefined;
    this._submitting = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        .headerTitle=${this.hass.localize("ui.panel.home.editor.title")}
        @closed=${this._dialogClosed}
      >
        <p class="description">
          ${this.hass.localize("ui.panel.home.editor.description")}
        </p>

        <ha-entities-picker
          autofocus
          .hass=${this.hass}
          .value=${this._config?.favorite_entities || []}
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.strategy.home.favorite_entities"
          )}
          .placeholder=${this.hass.localize(
            "ui.panel.lovelace.editor.strategy.home.add_favorite_entity"
          )}
          .helper=${this.hass.localize(
            "ui.panel.home.editor.favorite_entities_helper"
          )}
          reorder
          allow-custom-entity
          @value-changed=${this._favoriteEntitiesChanged}
        ></ha-entities-picker>

        <ha-alert alert-type="info">
          ${this.hass.localize("ui.panel.home.editor.areas_hint", {
            areas_page: html`<a
              href="/config/areas?historyBack=1"
              @click=${this.closeDialog}
              >${this.hass.localize("ui.panel.home.editor.areas_page")}</a
            >`,
          })}
        </ha-alert>

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _favoriteEntitiesChanged(ev: CustomEvent): void {
    const entities = ev.detail.value as string[];
    this._config = {
      ...this._config,
      favorite_entities: entities.length > 0 ? entities : undefined,
    };
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._config) {
      return;
    }

    this._submitting = true;

    try {
      await this._params.saveConfig(this._config);
      this.closeDialog();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Failed to save home configuration:", err);
    } finally {
      this._submitting = false;
    }
  }

  static styles = [
    haStyleDialog,
    css`
      ha-wa-dialog {
        --dialog-content-padding: var(--ha-space-6);
      }

      .description {
        margin: 0 0 var(--ha-space-4) 0;
        color: var(--secondary-text-color);
      }

      ha-entities-picker {
        display: block;
      }

      ha-alert {
        display: block;
        margin-top: var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-home": DialogEditHome;
  }
}
