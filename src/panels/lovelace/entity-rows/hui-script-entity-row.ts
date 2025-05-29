import "@material/mwc-button/mwc-button";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isUnavailableState } from "../../../data/entity";
import type { ScriptEntity } from "../../../data/script";
import { canRun, hasScriptFields } from "../../../data/script";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { ActionRowConfig, LovelaceRow } from "./types";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import { confirmAction } from "../common/confirm-action";

@customElement("hui-script-entity-row")
class HuiScriptEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

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

    const stateObj = this.hass.states[this._config.entity] as ScriptEntity;

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${stateObj.state === "on"
          ? html`<mwc-button @click=${this._cancelScript}>
              ${stateObj.attributes.mode !== "single" &&
              stateObj.attributes.current &&
              stateObj.attributes.current > 0
                ? this.hass.localize("ui.card.script.cancel_multiple", {
                    number: stateObj.attributes.current,
                  })
                : this.hass.localize("ui.card.script.cancel")}
            </mwc-button>`
          : ""}
        ${stateObj.state === "off" || stateObj.attributes.max
          ? html`<mwc-button
              @click=${this._runScript}
              .disabled=${isUnavailableState(stateObj.state) ||
              !canRun(stateObj)}
            >
              ${this._config.action_name ||
              this.hass!.localize("ui.card.script.run")}
            </mwc-button>`
          : ""}
      </hui-generic-entity-row>
    `;
  }

  static styles = css`
    mwc-button:last-child {
      margin-right: -0.57em;
      margin-inline-end: -0.57em;
      margin-inline-start: initial;
    }
  `;

  private _cancelScript(ev): void {
    ev.stopPropagation();
    this._callService("turn_off");
  }

  private async _runScript(ev): Promise<void> {
    ev.stopPropagation();

    if (hasScriptFields(this.hass!, this._config!.entity)) {
      showMoreInfoDialog(this, { entityId: this._config!.entity });
    } else if (
      !this._config?.confirmation ||
      (await confirmAction(
        this,
        this.hass!,
        this._config.confirmation,
        this._config.action_name || this.hass!.localize("ui.card.script.run")
      ))
    ) {
      this._callService("turn_on");
    }
  }

  private _callService(service: string): void {
    this.hass!.callService("script", service, {
      entity_id: this._config!.entity,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-script-entity-row": HuiScriptEntityRow;
  }
}
