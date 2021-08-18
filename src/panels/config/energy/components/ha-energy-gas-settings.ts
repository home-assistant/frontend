import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiFire, mdiPencil } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/ha-card";
import {
  EnergyPreferences,
  saveEnergyPreferences,
  GasSourceTypeEnergyPreference,
  EnergyPreferencesValidation,
  EnergyValidationIssue,
} from "../../../../data/energy";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { showEnergySettingsGasDialog } from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-gas-settings")
export class EnergyGasSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  protected render(): TemplateResult {
    const gasSources: GasSourceTypeEnergyPreference[] = [];
    const gasValidation: EnergyValidationIssue[][] = [];

    this.preferences.energy_sources.forEach((source, idx) => {
      if (source.type !== "gas") {
        return;
      }
      gasSources.push(source);

      if (this.validationResult) {
        gasValidation.push(this.validationResult.energy_sources[idx]);
      }
    });

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiFire}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.gas.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.gas.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="${documentationUrl(this.hass, "/docs/energy/gas/")}"
              >${this.hass.localize("ui.panel.config.energy.gas.learn_more")}</a
            >
          </p>
          ${gasValidation.map(
            (result) =>
              html`
                <ha-energy-validation-result
                  .hass=${this.hass}
                  .issues=${result}
                ></ha-energy-validation-result>
              `
          )}
          <h3>Gas consumption</h3>
          ${gasSources.map((source) => {
            const entityState = this.hass.states[source.stat_energy_from];
            return html`
              <div class="row" .source=${source}>
                ${entityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${entityState.attributes.icon}
                    ></ha-icon>`
                  : html`<ha-svg-icon .path=${mdiFire}></ha-svg-icon>`}
                <span class="content"
                  >${entityState
                    ? computeStateName(entityState)
                    : source.stat_energy_from}</span
                >
                <mwc-icon-button @click=${this._editSource}>
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </mwc-icon-button>
                <mwc-icon-button @click=${this._deleteSource}>
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </mwc-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiFire}></ha-svg-icon>
            <mwc-button @click=${this._addSource}>Add gas source</mwc-button>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _addSource() {
    showEnergySettingsGasDialog(this, {
      saveCallback: async (source) => {
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.concat(source),
        });
      },
    });
  }

  private _editSource(ev) {
    const origSource: GasSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsGasDialog(this, {
      source: { ...origSource },
      saveCallback: async (newSource) => {
        await this._savePreferences({
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.map((src) =>
            src === origSource ? newSource : src
          ),
        });
      },
    });
  }

  private async _deleteSource(ev) {
    const sourceToDelete: GasSourceTypeEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: "Are you sure you want to delete this source?",
      }))
    ) {
      return;
    }

    try {
      await this._savePreferences({
        ...this.preferences,
        energy_sources: this.preferences.energy_sources.filter(
          (source) => source !== sourceToDelete
        ),
      });
    } catch (err) {
      showAlertDialog(this, { title: `Failed to save config: ${err.message}` });
    }
  }

  private async _savePreferences(preferences: EnergyPreferences) {
    const result = await saveEnergyPreferences(this.hass, preferences);
    fireEvent(this, "value-changed", { value: result });
  }

  static get styles(): CSSResultGroup {
    return [haStyle, energyCardStyles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-gas-settings": EnergyGasSettings;
  }
}
