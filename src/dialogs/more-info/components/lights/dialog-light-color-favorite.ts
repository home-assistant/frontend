import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import { EntityRegistryEntry } from "../../../../data/entity_registry";
import { LightColor } from "../../../../data/light";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "./light-color-picker";
import { LightColorFavoriteDialogParams } from "./show-dialog-light-color-favorite";

@customElement("dialog-light-color-favorite")
class DialogLightColorFavorite extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() _dialogParams?: LightColorFavoriteDialogParams;

  @state() _entry?: EntityRegistryEntry;

  @state() _color?: LightColor;

  public async showDialog(
    dialogParams: LightColorFavoriteDialogParams
  ): Promise<void> {
    this._entry = dialogParams.entry;
    this._dialogParams = dialogParams;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._entry = undefined;
    this._color = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _colorChanged(ev: CustomEvent) {
    this._color = ev.detail;
  }

  private async _cancel() {
    this._dialogParams?.cancel?.();
    this.closeDialog();
  }

  private async _save() {
    if (!this._color) {
      this._cancel();
      return;
    }
    this._dialogParams?.submit?.(this._color);
    this.closeDialog();
  }

  protected render() {
    if (!this._entry) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this._cancel}
        .heading=${this._dialogParams?.title ?? ""}
        flexContent
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${this._dialogParams?.title}</span>
        </ha-dialog-header>
        <light-color-picker
          .hass=${this.hass}
          entityId=${this._entry.entity_id}
          .defaultMode=${this._dialogParams?.defaultMode}
          @color-changed=${this._colorChanged}
        >
        </light-color-picker>
        <ha-button slot="secondaryAction" dialogAction="cancel">
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button slot="primaryAction" @click=${this._save}
          >${this.hass.localize("ui.common.save")}</ha-button
        >
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

        light-color-picker {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-dialog {
            --dialog-surface-margin-top: 100px;
            --mdc-dialog-min-height: calc(100% - 100px);
            --mdc-dialog-max-height: calc(100% - 100px);
            --ha-dialog-border-radius: var(
              --ha-dialog-bottom-sheet-border-radius,
              28px 28px 0 0
            );
          }
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
