import "@material/mwc-button/mwc-button";
import {
  mdiDelete,
  mdiHomeExportOutline,
  mdiHomeImportOutline,
  mdiPencil,
  mdiTransmissionTower,
} from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/ha-card";
import {
  ConfigEntry,
  deleteConfigEntry,
  getConfigEntries,
} from "../../../../data/config_entries";
import {
  emptyGridSourceEnergyPreference,
  EnergyPreferences,
  EnergyPreferencesValidation,
  energySourcesByType,
  EnergyValidationIssue,
  FlowFromGridSourceEnergyPreference,
  FlowToGridSourceEnergyPreference,
  GridSourceTypeEnergyPreference,
  saveEnergyPreferences,
} from "../../../../data/energy";
import { showConfigFlowDialog } from "../../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";
import { documentationUrl } from "../../../../util/documentation-url";
import {
  showEnergySettingsGridFlowFromDialog,
  showEnergySettingsGridFlowToDialog,
} from "../dialogs/show-dialogs-energy";
import "./ha-energy-validation-result";
import { energyCardStyles } from "./styles";

@customElement("ha-energy-grid-settings")
export class EnergyGridSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public preferences!: EnergyPreferences;

  @property({ attribute: false })
  public validationResult?: EnergyPreferencesValidation;

  @state() private _configEntries?: ConfigEntry[];

  protected firstUpdated() {
    this._fetchCO2SignalConfigEntries();
  }

  protected render(): TemplateResult {
    const gridIdx = this.preferences.energy_sources.findIndex(
      (source) => source.type === "grid"
    );

    let gridSource: GridSourceTypeEnergyPreference;
    let gridValidation: EnergyValidationIssue[] | undefined;

    if (gridIdx === -1) {
      gridSource = emptyGridSourceEnergyPreference();
    } else {
      gridSource = this.preferences.energy_sources[
        gridIdx
      ] as GridSourceTypeEnergyPreference;
      if (this.validationResult) {
        gridValidation = this.validationResult.energy_sources[gridIdx];
      }
    }

    return html`
      <ha-card>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiTransmissionTower}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.energy.grid.title")}
        </h1>

        <div class="card-content">
          <p>
            ${this.hass.localize("ui.panel.config.energy.grid.sub")}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="${documentationUrl(
                this.hass,
                "/docs/energy/electricity-grid/"
              )}"
              >${this.hass.localize(
                "ui.panel.config.energy.grid.learn_more"
              )}</a
            >
          </p>
          ${gridValidation
            ? html`
                <ha-energy-validation-result
                  .hass=${this.hass}
                  .issues=${gridValidation}
                ></ha-energy-validation-result>
              `
            : ""}

          <h3>Grid consumption</h3>
          ${gridSource.flow_from.map((flow) => {
            const entityState = this.hass.states[flow.stat_energy_from];
            return html`
              <div class="row" .source=${flow}>
                ${entityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${entityState?.attributes.icon}
                    ></ha-icon>`
                  : html`<ha-svg-icon
                      .path=${mdiHomeImportOutline}
                    ></ha-svg-icon>`}
                <span class="content"
                  >${entityState
                    ? computeStateName(entityState)
                    : flow.stat_energy_from}</span
                >
                <mwc-icon-button @click=${this._editFromSource}>
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </mwc-icon-button>
                <mwc-icon-button @click=${this._deleteFromSource}>
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </mwc-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiHomeImportOutline}></ha-svg-icon>
            <mwc-button @click=${this._addFromSource}
              >Add consumption</mwc-button
            >
          </div>

          <h3>Return to grid</h3>
          ${gridSource.flow_to.map((flow) => {
            const entityState = this.hass.states[flow.stat_energy_to];
            return html`
              <div class="row" .source=${flow}>
                ${entityState?.attributes.icon
                  ? html`<ha-icon
                      .icon=${entityState.attributes.icon}
                    ></ha-icon>`
                  : html`<ha-svg-icon
                      .path=${mdiHomeExportOutline}
                    ></ha-svg-icon>`}
                <span class="content"
                  >${entityState
                    ? computeStateName(entityState)
                    : flow.stat_energy_to}</span
                >
                <mwc-icon-button @click=${this._editToSource}>
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </mwc-icon-button>
                <mwc-icon-button @click=${this._deleteToSource}>
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </mwc-icon-button>
              </div>
            `;
          })}
          <div class="row border-bottom">
            <ha-svg-icon .path=${mdiHomeExportOutline}></ha-svg-icon>
            <mwc-button @click=${this._addToSource}>Add return</mwc-button>
          </div>

          <h3>Grid carbon footprint</h3>
          ${this._configEntries?.map(
            (entry) => html`<div class="row" .entry=${entry}>
              <img
                referrerpolicy="no-referrer"
                src=${brandsUrl({
                  domain: "co2signal",
                  type: "icon",
                  darkOptimized: this.hass.selectedTheme?.dark,
                })}
              />
              <span class="content">${entry.title}</span>
              <a href=${`/config/integrations#config_entry=${entry.entry_id}`}>
                <mwc-icon-button>
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </mwc-icon-button>
              </a>
              <mwc-icon-button @click=${this._removeCO2Sensor}>
                <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
              </mwc-icon-button>
            </div>`
          )}
          ${this._configEntries?.length === 0
            ? html`
                <div class="row border-bottom">
                  <img
                    referrerpolicy="no-referrer"
                    src=${brandsUrl({
                      domain: "co2signal",
                      type: "icon",
                      darkOptimized: this.hass.selectedTheme?.dark,
                    })}
                  />
                  <mwc-button @click=${this._addCO2Sensor}>
                    Add CO2 signal integration
                  </mwc-button>
                </div>
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  private async _fetchCO2SignalConfigEntries() {
    this._configEntries = (await getConfigEntries(this.hass)).filter(
      (entry) => entry.domain === "co2signal"
    );
  }

  private _addCO2Sensor() {
    showConfigFlowDialog(this, {
      startFlowHandler: "co2signal",
      dialogClosedCallback: () => {
        this._fetchCO2SignalConfigEntries();
      },
    });
  }

  private async _removeCO2Sensor(ev) {
    const entryId = ev.currentTarget.closest(".row").entry.entry_id;
    if (
      !(await showConfirmationDialog(this, {
        title:
          "Are you sure you want to delete this integration? It will remove the entities it provides",
      }))
    ) {
      return;
    }

    await deleteConfigEntry(this.hass, entryId);
    this._fetchCO2SignalConfigEntries();
  }

  private _addFromSource() {
    showEnergySettingsGridFlowFromDialog(this, {
      saveCallback: async (flow) => {
        let preferences: EnergyPreferences;
        const gridSource = this.preferences.energy_sources.find(
          (src) => src.type === "grid"
        ) as GridSourceTypeEnergyPreference | undefined;

        if (!gridSource) {
          preferences = {
            ...this.preferences,
            energy_sources: [
              ...this.preferences.energy_sources,
              {
                ...emptyGridSourceEnergyPreference(),
                flow_from: [flow],
              },
            ],
          };
        } else {
          preferences = {
            ...this.preferences,
            energy_sources: this.preferences.energy_sources.map((src) =>
              src.type === "grid"
                ? { ...src, flow_from: [...gridSource.flow_from, flow] }
                : src
            ),
          };
        }
        await this._savePreferences(preferences);
      },
    });
  }

  private _addToSource() {
    showEnergySettingsGridFlowToDialog(this, {
      saveCallback: async (flow) => {
        let preferences: EnergyPreferences;
        const gridSource = this.preferences.energy_sources.find(
          (src) => src.type === "grid"
        ) as GridSourceTypeEnergyPreference | undefined;

        if (!gridSource) {
          preferences = {
            ...this.preferences,
            energy_sources: [
              ...this.preferences.energy_sources,
              {
                ...emptyGridSourceEnergyPreference(),
                flow_to: [flow],
              },
            ],
          };
        } else {
          preferences = {
            ...this.preferences,
            energy_sources: this.preferences.energy_sources.map((src) =>
              src.type === "grid"
                ? { ...src, flow_to: [...gridSource.flow_to, flow] }
                : src
            ),
          };
        }
        await this._savePreferences(preferences);
      },
    });
  }

  private _editFromSource(ev) {
    const origSource: FlowFromGridSourceEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsGridFlowFromDialog(this, {
      source: { ...origSource },
      saveCallback: async (source) => {
        const flowFrom = energySourcesByType(this.preferences).grid![0]
          .flow_from;

        const preferences: EnergyPreferences = {
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.map((src) =>
            src.type === "grid"
              ? {
                  ...src,
                  flow_from: flowFrom.map((flow) =>
                    flow === origSource ? source : flow
                  ),
                }
              : src
          ),
        };
        await this._savePreferences(preferences);
      },
    });
  }

  private _editToSource(ev) {
    const origSource: FlowToGridSourceEnergyPreference =
      ev.currentTarget.closest(".row").source;
    showEnergySettingsGridFlowToDialog(this, {
      source: { ...origSource },
      saveCallback: async (source) => {
        const flowTo = energySourcesByType(this.preferences).grid![0].flow_to;

        const preferences: EnergyPreferences = {
          ...this.preferences,
          energy_sources: this.preferences.energy_sources.map((src) =>
            src.type === "grid"
              ? {
                  ...src,
                  flow_to: flowTo.map((flow) =>
                    flow === origSource ? source : flow
                  ),
                }
              : src
          ),
        };
        await this._savePreferences(preferences);
      },
    });
  }

  private async _deleteFromSource(ev) {
    const sourceToDelete: FlowFromGridSourceEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: "Are you sure you want to delete this source?",
      }))
    ) {
      return;
    }

    const flowFrom = energySourcesByType(
      this.preferences
    ).grid![0].flow_from.filter((flow) => flow !== sourceToDelete);

    const preferences: EnergyPreferences = {
      ...this.preferences,
      energy_sources: this.preferences.energy_sources.map((source) =>
        source.type === "grid" ? { ...source, flow_from: flowFrom } : source
      ),
    };

    try {
      await this._savePreferences(preferences);
    } catch (err) {
      showAlertDialog(this, { title: `Failed to save config: ${err.message}` });
    }
  }

  private async _deleteToSource(ev) {
    const sourceToDelete: FlowToGridSourceEnergyPreference =
      ev.currentTarget.closest(".row").source;

    if (
      !(await showConfirmationDialog(this, {
        title: "Are you sure you want to delete this source?",
      }))
    ) {
      return;
    }

    const flowTo = energySourcesByType(
      this.preferences
    ).grid![0].flow_to.filter((flow) => flow !== sourceToDelete);

    const preferences: EnergyPreferences = {
      ...this.preferences,
      energy_sources: this.preferences.energy_sources.map((source) =>
        source.type === "grid" ? { ...source, flow_to: flowTo } : source
      ),
    };

    try {
      await this._savePreferences(preferences);
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
    "ha-energy-grid-settings": EnergyGridSettings;
  }
}
