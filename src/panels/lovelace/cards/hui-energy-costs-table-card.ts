import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/chart/statistics-chart";
import "../../../components/ha-card";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { EnergyDevicesGraphCardConfig } from "./types";

@customElement("hui-energy-costs-table-card")
export class HuiEnergyCostsTableCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  public disconnectedCallback() {
    super.disconnectedCallback();
  }

  public connectedCallback() {
    super.connectedCallback();
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergyDevicesGraphCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html` <ha-card .header="${this._config.title}">
      Costs table
    </ha-card>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
      }
      .content {
        padding: 16px;
      }
      .has-header {
        padding-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-costs-table-card": HuiEnergyCostsTableCard;
  }
}
