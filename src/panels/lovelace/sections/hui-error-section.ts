import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-label-badge";
import "../../../components/ha-svg-icon";
import { LovelaceSectionElement } from "../../../data/lovelace";
import { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { HomeAssistant } from "../../../types";

export interface ErrorSectionConfig extends LovelaceSectionConfig {
  error: string;
}

export const createErrorSectionElement = (config: ErrorSectionConfig) => {
  const el = document.createElement(
    "hui-error-section"
  ) as LovelaceSectionElement;
  el.setConfig(config);
  return el;
};

export const createErrorSectionConfig = (
  error: string
): ErrorSectionConfig => ({
  type: "error",
  error,
});

@customElement("hui-error-section")
export class HuiErrorSection
  extends LitElement
  implements LovelaceSectionElement
{
  public hass?: HomeAssistant;

  @property({ type: Boolean }) public isStrategy = false;

  @state() private _config?: ErrorSectionConfig;

  public setConfig(config: ErrorSectionConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    // Todo improve
    return html`
      <h1>Error</h1>
      <p>${this._config.error}</p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-section": HuiErrorSection;
  }
}
