import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ref } from "lit/directives/ref";
import type { HomeAssistant } from "../../../types";
import type { HuiHeadingCard } from "../../lovelace/cards/hui-heading-card";
import "../../lovelace/cards/hui-heading-card";
import type { HeadingCardConfig } from "../../lovelace/cards/types";

@customElement("ha-config-lovelace-heading")
export class HaConfigLovelaceHeading extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public heading = "";

  @property({ attribute: false }) public icon?: string;

  @property({ attribute: false }) public navigationPath?: string;

  private _headingCardRef = ref<HuiHeadingCard>();

  protected firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    this._applyConfig();
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    if (
      changed.has("heading") ||
      changed.has("icon") ||
      changed.has("navigationPath") ||
      changed.has("hass")
    ) {
      this._applyConfig();
    }
  }

  private _applyConfig(): void {
    const el = this._headingCardRef.value;
    if (!el) {
      return;
    }
    const tap_action = this.navigationPath
      ? {
          action: "navigate" as const,
          navigation_path: this.navigationPath,
        }
      : { action: "none" as const };

    const config: HeadingCardConfig = {
      type: "heading",
      heading: this.heading,
      icon: this.icon,
      tap_action,
    };
    el.setConfig(config);
  }

  protected render() {
    return html`
      <hui-heading-card ${ref(this._headingCardRef)} .hass=${this.hass}>
      </hui-heading-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-lovelace-heading": HaConfigLovelaceHeading;
  }
}
