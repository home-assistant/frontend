import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-alert";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-labels-picker";
import "../../../../components/ha-textfield";
import "../../../../components/ha-yaml-editor";
import { EntityRegistryIcon } from "../../../../data/entity_registry";
import { entryIcon } from "../../../../data/icons";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { EntityStateIconDialogParams } from "./show-dialog-entity-state-icon";

@customElement("dialog-entity-state-icon")
class DialogEntityStateIcon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EntityStateIconDialogParams;

  @state() private _submitting = false;

  @state() private _config?: EntityRegistryIcon;

  public async showDialog(params: EntityStateIconDialogParams): Promise<void> {
    this._params = params;

    const icon = this._params.icon;

    this._config = icon ?? {
      default: icon || (await entryIcon(this.hass, this._params.entry)) || "",
    };

    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${"Entity state icon"}
      >
        <ha-yaml-editor
          .defaultValue=${this._config}
          @value-changed=${this._dataChanged}
        ></ha-yaml-editor>

        <ha-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.dialogs.device-registry-detail.update")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _dataChanged(ev): void {
    this._config = ev.detail.value;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      const icon =
        Object.keys(this._config!).length === 0 ? null : this._config!;
      this._params!.updateIcon(icon);
      this.closeDialog();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [haStyle, haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-entity-state-icon": DialogEntityStateIcon;
  }
}
