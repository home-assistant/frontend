import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import "../../components/buttons/ha-progress-button";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-card";
import "../../components/ha-circular-progress";
import { haStyle } from "../../resources/styles";
import "../../styles/polymer-ha-style";
import type { HomeAssistant } from "../../types";
import { HaFormCustomize } from "./customize/ha-form-customize";

@customElement("ha-entity-config")
export class HaEntityConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public selectedEntityId!: string;

  @property() private _formState: "initial" | "loading" | "saving" | "editing" =
    "initial";

  @query("#form") private _form!: HaFormCustomize;

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="card-content">
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this.selectedEntityId}
            .configValue=${"entity"}
            @change=${this._selectedEntityChanged}
            allow-custom-entity
            hideClearIcon
          >
          </ha-entity-picker>

          <div class="form-container">
            <ha-form-customize .hass=${this.hass} .id=${"form"}>
            </ha-form-customize>
          </div>
        </div>
        <div class="card-actions">
          <ha-progress-button
            @click=${this._saveEntity}
            .disabled=${this._formState !== "editing"}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      changedProps.has("selectedEntityId") &&
      changedProps.get("selectedEntityId") !== this.selectedEntityId
    ) {
      this._selectEntity(this.selectedEntityId);
      this.requestUpdate();
    }
  }

  private _selectedEntityChanged(ev) {
    this._selectEntity(ev.target.value);
  }

  private async _selectEntity(entityId?: string) {
    if (!this._form || !entityId) return;
    const entity = this.hass.states[entityId];
    if (!entity) return;

    this._formState = "loading";
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const el = this;
    await this._form.loadEntity(entity);
    el._formState = "editing";
  }

  private async _saveEntity(ev) {
    if (this._formState !== "editing") return;
    this._formState = "saving";
    const button = ev.target;
    button.progress = true;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const el = this;
    try {
      await this._form.saveEntity();
      el._formState = "editing";
      button.actionSuccess();
    } catch {
      button.actionError();
    } finally {
      button.progress = false;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          direction: ltr;
        }

        .form-placeholder {
          height: 96px;
        }

        .hidden {
          display: none;
        }
      `,
    ];
  }
}
