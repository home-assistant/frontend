import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-form/ha-form";
import type { ZHAConfiguration } from "../../../../../data/zha";
import {
  fetchZHAConfiguration,
  updateZHAConfiguration,
} from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

@customElement("zha-config-section-page")
class ZHAConfigSectionPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: "section-id" }) public sectionId!: string;

  @state() private _configuration?: ZHAConfiguration;

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this.hass.loadBackendTranslation("config_panel", "zha", false);
      this._fetchConfiguration();
    }
  }

  private async _fetchConfiguration(): Promise<void> {
    this._configuration = await fetchZHAConfiguration(this.hass!);
  }

  protected render(): TemplateResult {
    const schema = this._configuration?.schemas[this.sectionId];
    const data = this._configuration?.data[this.sectionId];

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          `component.zha.config_panel.${this.sectionId}.title`
        ) || this.sectionId}
        back-path="/config/zha/dashboard"
      >
        <div class="container">
          <ha-card>
            ${schema && data
              ? html`
                  <div class="card-content">
                    <ha-form
                      .hass=${this.hass}
                      .schema=${schema}
                      .data=${data}
                      @value-changed=${this._dataChanged}
                      .computeLabel=${this._computeLabelCallback(
                        this.hass.localize,
                        this.sectionId
                      )}
                    ></ha-form>
                  </div>
                  <div class="card-actions">
                    <ha-progress-button
                      appearance="filled"
                      variant="brand"
                      @click=${this._updateConfiguration}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zha.configuration_page.update_button"
                      )}
                    </ha-progress-button>
                  </div>
                `
              : nothing}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _dataChanged(ev) {
    this._configuration!.data[this.sectionId] = ev.detail.value;
  }

  private async _updateConfiguration(ev: Event): Promise<void> {
    const button = ev.currentTarget as HTMLElement & {
      progress: boolean;
      actionSuccess: () => void;
      actionError: () => void;
    };
    button.progress = true;
    try {
      await updateZHAConfiguration(this.hass!, this._configuration!.data);
      button.actionSuccess();
    } catch (_err: any) {
      button.actionError();
    } finally {
      button.progress = false;
    }
  }

  private _computeLabelCallback(localize, section: string) {
    return (schema) =>
      localize(`component.zha.config_panel.${section}.${schema.name}`) ||
      schema.name;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-card {
          max-width: 600px;
          margin: auto;
        }

        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-section-page": ZHAConfigSectionPage;
  }
}
