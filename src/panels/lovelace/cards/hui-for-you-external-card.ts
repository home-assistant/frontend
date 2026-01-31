import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-card";
import "../../../components/tile/ha-tile-container";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import type { ExternalForYouSuggestion } from "../../../external_app/external_messaging";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { tileCardStyle } from "./tile/tile-card-style";
import type { ForYouExternalCardConfig } from "./types";

const DEFAULT_ICON = "mdi:lightbulb";

@customElement("hui-for-you-external-card")
export class HuiForYouExternalCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ForYouExternalCardConfig;

  @state() private _suggestion?: ExternalForYouSuggestion | null;

  @state() private _loading = true;

  public setConfig(config: ForYouExternalCardConfig): void {
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      rows: 1,
      min_columns: 6,
      min_rows: 1,
    };
  }

  protected async firstUpdated(): Promise<void> {
    await this._loadSuggestion();
    this._loading = false;
  }

  private async _loadSuggestion(): Promise<void> {
    if (!this.hass?.auth.external?.config.hasForYouSuggestion) {
      this._suggestion = null;
      return;
    }

    try {
      this._suggestion =
        await this.hass.auth.external.sendMessage<"for_you/get_suggestion">({
          type: "for_you/get_suggestion",
        });
    } catch {
      this._suggestion = null;
    }
  }

  private _handleTap(): void {
    if (!this._suggestion || !this.hass?.auth.external) {
      return;
    }

    this.hass.auth.external.fireMessage({
      type: "for_you/suggestion_selected",
      payload: {
        app_payload: this._suggestion.app_payload,
      },
    });
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this._config || !this.hass) {
      return;
    }

    // Hide when loading or no suggestion available
    const shouldBeHidden = this._loading || !this._suggestion;

    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass || this.hidden || !this._suggestion) {
      return nothing;
    }

    const icon = this._suggestion.mdi_icon || DEFAULT_ICON;
    const label = this.hass.localize("ui.card.for-you-external.title");

    return html`
      <ha-card>
        <ha-tile-container .interactive=${true} @action=${this._handleTap}>
          <ha-tile-icon slot="icon" .icon=${icon}></ha-tile-icon>
          <ha-tile-info
            slot="info"
            .primary=${label}
            .secondary=${this._suggestion.text}
          ></ha-tile-info>
        </ha-tile-container>
      </ha-card>
    `;
  }

  static styles = [
    tileCardStyle,
    css`
      :host {
        --tile-color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-for-you-external-card": HuiForYouExternalCard;
  }
}
