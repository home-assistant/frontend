import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import { EntityRegistryEntry } from "../../../../data/entity_registry";
import { FavoriteColor } from "../../../../data/light";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "./light-color-picker";
import { LightColorFavoriteDialogParams } from "./show-dialog-light-color-favorite";

@customElement("dialog-light-color-favorite")
class DialogLightColorFavorite extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() _dialogParams?: LightColorFavoriteDialogParams;

  @state() _entry?: EntityRegistryEntry;

  @state() _color?: FavoriteColor;

  public async showDialog(
    dialogParams: LightColorFavoriteDialogParams
  ): Promise<void> {
    this._entry = dialogParams.entry;
    this._dialogParams = dialogParams;
    await this.updateComplete;
  }

  public closeDialog(): void {
    if (this._dialogParams?.cancel) {
      this._dialogParams.cancel();
    }
    this._dialogParams = undefined;
    this._entry = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _colorChanged(ev: CustomEvent) {
    this._color = ev.detail;
  }

  private async _save() {
    if (!this._color) return;

    this._dialogParams?.submit?.(this._color);
    this._dialogParams = undefined;
    this._entry = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._entry) {
      return nothing;
    }

    const title = "Edit favorite color";

    return html`
      <ha-dialog open @closed=${this.closeDialog} .heading=${title}>
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${title}</span>
        </ha-dialog-header>
        <div>
          <light-color-picker
            .hass=${this.hass}
            entityId=${this._entry.entity_id}
            @color-changed=${this._colorChanged}
          >
          </light-color-picker>
        </div>
        <ha-button slot="secondaryAction" dialogAction="cancel">
          Cancel
        </ha-button>
        <ha-button slot="primaryAction" @click=${this._save}> Save </ha-button>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-light-color-favorite": DialogLightColorFavorite;
  }
}
