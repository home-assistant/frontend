import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { getStates } from "../../../../common/entity/get_states";
import "../../../../components/ha-alert";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-labels-picker";
import "../../../../components/ha-textfield";
import "../../../../components/ha-yaml-editor";
import type { EntityRegistryIcon } from "../../../../data/entity_registry";
import { getEntityIcon } from "../../../../data/icons";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { EntityStateIconDialogParams } from "./show-dialog-entity-state-icon";

@customElement("dialog-entity-state-icon")
class DialogEntityStateIcon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EntityStateIconDialogParams;

  @state() private _submitting = false;

  @state() private _config?: EntityRegistryIcon;

  public async showDialog(params: EntityStateIconDialogParams): Promise<void> {
    this._params = params;

    const icon = this._params.icon;

    this._config = typeof icon === "object" ? icon : {};

    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._config = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private get _states() {
    const entity = this.hass.states[this._params!.entry.entity_id];
    const states = getStates(entity);
    return states.filter((s) => !["unknown", "unavailable"].includes(s));
  }

  protected render() {
    if (!this._params || !this._config) {
      return nothing;
    }

    const stateObj = this.hass.states[this._params.entry.entity_id];

    const domain = computeStateDomain(stateObj);

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${"Entity state icon"}
      >
        ${this._states.map((s) => {
          const value = this._config?.state?.[s];

          const placeholder = until(
            getEntityIcon(this.hass, domain, stateObj, s, this._params!.entry)
          );

          return html`
            <div class="row">
              <p>${this.hass.formatEntityState(stateObj, s)}</p>
              <ha-icon-picker
                .hass=${this.hass}
                .id=${s}
                .value=${value}
                @value-changed=${this._iconChanged}
                .placeholder=${placeholder}
              ></ha-icon-picker>
            </div>
          `;
        })}

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

  private _iconChanged(ev): void {
    const value = ev.detail.value;
    const id = ev.currentTarget.id;

    const newConfig = {
      ...this._config!,
      state: {
        ...this._config!.state,
        [id]: value,
      },
    };

    if (!value) {
      delete newConfig.state[id];
    }

    this._config = newConfig;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      const icon =
        !this._config || Object.keys(this._config).length === 0
          ? null
          : this._config;
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
    return [
      haStyle,
      haStyleDialog,
      css`
        .row {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .row p {
          width: 100px;
        }
        .row ha-icon-picker {
          flex: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-entity-state-icon": DialogEntityStateIcon;
  }
}
