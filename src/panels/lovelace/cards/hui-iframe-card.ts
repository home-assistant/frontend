import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../types";
import type { IframeCardConfig } from "./types";
import { IFRAME_SANDBOX } from "../../../util/iframe";

@customElement("hui-iframe-card")
export class HuiIframeCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-iframe-card-editor");
    return document.createElement("hui-iframe-card-editor");
  }

  public static getStubConfig(): IframeCardConfig {
    return {
      type: "iframe",
      url: "https://www.home-assistant.io",
      aspect_ratio: "50%",
    };
  }

  @property({ attribute: false })
  public layout?: string;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() protected _config?: IframeCardConfig;

  public getCardSize(): number {
    if (!this._config) {
      return 5;
    }
    const aspectRatio = this._config.aspect_ratio
      ? Number(this._config.aspect_ratio.replace("%", ""))
      : 50;
    return 1 + aspectRatio / 25;
  }

  public setConfig(config: IframeCardConfig): void {
    if (!config.url) {
      throw new Error("URL required");
    }

    this._config = config;
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    let padding = "";
    const ignoreAspectRatio = this.layout === "panel" || this.layout === "grid";
    if (!ignoreAspectRatio) {
      if (this._config.aspect_ratio) {
        const ratio = parseAspectRatio(this._config.aspect_ratio);
        if (ratio && ratio.w > 0 && ratio.h > 0) {
          padding = `${((100 * ratio.h) / ratio.w).toFixed(2)}%`;
        }
      } else {
        padding = "50%";
      }
    }

    const target_protocol = new URL(this._config.url, location.toString())
      .protocol;
    if (location.protocol === "https:" && target_protocol !== "https:") {
      return html`
        <ha-alert alert-type="error">
          ${this.hass!.localize(
            "ui.panel.lovelace.cards.iframe.error_secure_context",
            {
              target_protocol,
              context_protocol: location.protocol,
            }
          )}
        </ha-alert>
      `;
    }

    let sandbox_user_params = "";
    if (this._config.allow_open_top_navigation) {
      sandbox_user_params += "allow-top-navigation-by-user-activation";
    }
    const sandbox_params = this._config.disable_sandbox
      ? undefined
      : `${sandbox_user_params} ${IFRAME_SANDBOX}`;

    return html`
      <ha-card .header=${this._config.title}>
        <div
          id="root"
          style=${styleMap({
            "padding-top": padding,
          })}
        >
          <iframe
            title=${ifDefined(this._config.title)}
            src=${this._config.url}
            sandbox=${ifDefined(sandbox_params)}
            allow=${this._config.allow ?? "fullscreen"}
          ></iframe>
        </div>
      </ha-card>
    `;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: "full",
      rows: 4,
      min_columns: 3,
      min_rows: 2,
    };
  }

  static styles = css`
    ha-card {
      overflow: hidden;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    #root {
      width: 100%;
      height: 100%;
      position: relative;
    }

    iframe {
      position: absolute;
      border: none;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-iframe-card": HuiIframeCard;
  }
}
