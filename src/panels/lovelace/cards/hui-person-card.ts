import { mdiBattery70 } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import { computeUserInitials } from "../../../data/user";
import { HomeAssistant } from "../../../types";
// eslint-disable-next-line import/no-duplicates
import "../components/hui-warning";
// eslint-disable-next-line import/no-duplicates
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { PersonCardConfig } from "./types";

@customElement("hui-person-card")
export class HuiPersonCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-person-card-editor");
    return document.createElement("hui-person-card-editor");
  }

  public static getStubConfig(): PersonCardConfig {
    return {
      type: "person",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() protected _config?: PersonCardConfig;

  public getCardSize(): number {
    return 5;
  }

  public setConfig(config: PersonCardConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity required");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.size === 1 && changedProps.has("hass")) {
      return !changedProps.get("hass");
    }
    return true;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | PersonCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity!];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity!)}
        </hui-warning>
      `;
    }

    let backgroundColor: string | undefined;
    let foregroundColor = "";
    let image = stateObj.attributes.entity_picture;
    let batteryPercent: number | undefined;

    if (stateObj.attributes.source) {
      batteryPercent =
        this.hass.states[stateObj.attributes.source].attributes.battery;
    }

    if (!image) {
      if (backgroundColor === undefined) {
        const computedStyle = getComputedStyle(document.body);
        backgroundColor = encodeURIComponent(
          computedStyle.getPropertyValue("--light-primary-color").trim()
        );
        foregroundColor = encodeURIComponent(
          (
            computedStyle.getPropertyValue("--text-light-primary-color") ||
            computedStyle.getPropertyValue("--primary-text-color")
          ).trim()
        );
      }
      const initials = computeUserInitials(
        stateObj.attributes.friendly_name || ""
      );
      image = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50' width='50' height='50' style='background-color:${backgroundColor}'%3E%3Cg%3E%3Ctext font-family='roboto' x='50%25' y='50%25' text-anchor='middle' stroke='${foregroundColor}' font-size='1.3em' dy='.3em'%3E${initials}%3C/text%3E%3C/g%3E%3C/svg%3E`;
    }

    return html`
      <ha-card>
        <hui-image .hass=${this.hass} .image=${image}></hui-image>
        <div class="name">${computeStateName(stateObj)}</div>
        <div class="state">
          ${computeStateDisplay(
            this.hass!.localize,
            stateObj,
            this.hass.locale
          )}
        </div>
        <div class="battery">
          <ha-svg-icon .path=${mdiBattery70}></ha-svg-icon> ${batteryPercent} %
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 16px;
      }

      ha-card.clickable {
        cursor: pointer;
      }

      hui-image {
        display: block;
        width: 100%;
        max-width: 250px;
        border-radius: 50%;
        overflow: hidden;
      }

      .name {
        font-size: 24px;
        padding-top: 16px;
        font-weight: 500;
        text-align: center;
      }

      .state {
        color: var(--disabled-text-color);
        padding-top: 24px;
      }

      .battery {
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        padding: 4px;
        font-size: 16px;
        background-color: var(
          --ha-card-background,
          var(--card-background-color, white)
        );
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-person-card": HuiPersonCard;
  }
}
