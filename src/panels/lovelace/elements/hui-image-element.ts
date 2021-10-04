import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { computeTooltip } from "../common/compute-tooltip";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import "../components/hui-image";
import { ImageElementConfig, LovelaceElement } from "./types";

@customElement("hui-image-element")
export class HuiImageElement extends LitElement implements LovelaceElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ImageElementConfig;

  public setConfig(config: ImageElementConfig): void {
    if (!config) {
      throw Error("Invalid configuration");
    }

    this._config = { hold_action: { action: "more-info" }, ...config };

    // eslint-disable-next-line wc/no-self-class
    this.classList.toggle(
      "clickable",
      this._config.tap_action && this._config.tap_action.action !== "none"
    );
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <hui-image
        .hass=${this.hass}
        .entity=${this._config.entity}
        .image=${this._config.image}
        .stateImage=${this._config.state_image}
        .cameraImage=${this._config.camera_image}
        .filter=${this._config.filter}
        .stateFilter=${this._config.state_filter}
        .title=${computeTooltip(this.hass, this._config)}
        .aspectRatio=${this._config.aspect_ratio}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      ></hui-image>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host(.clickable) {
        cursor: pointer;
        overflow: hidden;
        -webkit-touch-callout: none !important;
      }
      hui-image {
        -webkit-user-select: none !important;
      }
      hui-image:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
      }
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-image-element": HuiImageElement;
  }
}
