import "@polymer/paper-input/paper-textarea";

import { HomeAssistant } from "../../../../types";
import { LovelaceBadgeConfig } from "../../../../data/lovelace";
import { ConfigError } from "../types";
import { computeRTL } from "../../../../common/util/compute_rtl";
import { LovelaceBadge } from "../../types";
import { createBadgeElement } from "../../create-element/create-badge-element";
import { createErrorBadgeConfig } from "../../badges/hui-error-badge";

export class HuiBadgePreview extends HTMLElement {
  private _hass?: HomeAssistant;
  private _element?: LovelaceBadge;
  private _config?: LovelaceBadgeConfig;

  private get _error() {
    return this._element?.tagName === "HUI-ERROR-BADGE";
  }

  constructor() {
    super();
    this.addEventListener("ll-rebuild", () => {
      this._cleanup();
      if (this._config) {
        this.config = this._config;
      }
    });
  }

  set hass(hass: HomeAssistant) {
    if (!this._hass || this._hass.language !== hass.language) {
      this.style.direction = computeRTL(hass) ? "rtl" : "ltr";
    }

    this._hass = hass;
    if (this._element) {
      this._element.hass = hass;
    }
  }

  set error(error: ConfigError) {
    this._createBadge(
      createErrorBadgeConfig(`${error.type}: ${error.message}`)
    );
  }

  set config(configValue: LovelaceBadgeConfig) {
    const curConfig = this._config;
    this._config = configValue;

    if (!configValue) {
      this._cleanup();
      return;
    }

    if (!this._element) {
      this._createBadge(configValue);
      return;
    }

    // in case the element was an error element we always want to recreate it
    if (!this._error && curConfig && configValue.type === curConfig.type) {
      try {
        this._element.setConfig(configValue);
      } catch (err) {
        this._createBadge(createErrorBadgeConfig(err.message));
      }
    } else {
      this._createBadge(configValue);
    }
  }

  private _createBadge(configValue: LovelaceBadgeConfig): void {
    this._cleanup();
    this._element = createBadgeElement(configValue);

    if (this._hass) {
      this._element!.hass = this._hass;
    }

    this.appendChild(this._element!);
  }

  private _cleanup() {
    if (!this._element) {
      return;
    }
    this.removeChild(this._element);
    this._element = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-badge-preview": HuiBadgePreview;
  }
}

customElements.define("hui-badge-preview", HuiBadgePreview);
