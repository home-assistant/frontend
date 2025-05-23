import "@material/mwc-button/mwc-button";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/entity/ha-entity-toggle";
import { UNAVAILABLE } from "../../../data/entity";
import { activateScene } from "../../../data/scene";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { ActionRowConfig, LovelaceRow } from "./types";
import { confirmAction } from "../common/confirm-action";

@customElement("hui-scene-entity-row")
class HuiSceneEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: ActionRowConfig;

  public setConfig(config: ActionRowConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <mwc-button
          @click=${this._callService}
          .disabled=${stateObj.state === UNAVAILABLE}
          class="text-content"
        >
          ${this._config.action_name ||
          this.hass!.localize("ui.card.scene.activate")}
        </mwc-button>
      </hui-generic-entity-row>
    `;
  }

  static styles = css`
    mwc-button {
      margin-right: -0.57em;
      margin-inline-end: -0.57em;
      margin-inline-start: initial;
    }
  `;

  private async _callService(ev: Event): Promise<void> {
    ev.stopPropagation();
    if (
      !this._config?.confirmation ||
      (await confirmAction(
        this,
        this.hass,
        this._config.confirmation,
        this._config.action_name || this.hass.localize("ui.card.scene.activate")
      ))
    ) {
      activateScene(this.hass, this._config!.entity);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-scene-entity-row": HuiSceneEntityRow;
  }
}
