import "@material/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-relative-time";
import "../../../components/ha-service-control";
import "../../../components/entity/state-info";
import { HomeAssistant } from "../../../types";
import { canRun, ScriptEntity } from "../../../data/script";
import { isUnavailableState } from "../../../data/entity";
import { computeObjectId } from "../../../common/entity/compute_object_id";

@customElement("more-info-script")
class MoreInfoScript extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  private _scriptData: Record<string, any> = {};

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj as ScriptEntity;

    const fields =
      this.hass.services.script[computeObjectId(this.stateObj.entity_id)]
        ?.fields;

    const hasFields = fields && Object.keys(fields).length > 0;

    return html`
      <div class="flex">
        <state-info
          .hass=${this.hass}
          .stateObj=${stateObj}
          inDialog
        ></state-info>
        ${stateObj.state === "on"
          ? html`<mwc-button @click=${this._cancelScript}>
              ${stateObj.attributes.mode !== "single" &&
              (stateObj.attributes.current || 0) > 0
                ? this.hass.localize("ui.card.script.cancel_multiple", {
                    number: stateObj.attributes.current,
                  })
                : this.hass.localize("ui.card.script.cancel")}
            </mwc-button>`
          : nothing}
        ${stateObj.state === "off" || stateObj.attributes.max
          ? html`<mwc-button
              @click=${this._runScript}
              .disabled=${isUnavailableState(stateObj.state) ||
              !canRun(stateObj)}
            >
              ${this.hass!.localize("ui.card.script.run")}
            </mwc-button>`
          : nothing}
      </div>

      ${hasFields
        ? html`
            <ha-service-control
              hidePicker
              hideDescription
              .hass=${this.hass}
              .value=${this._scriptData}
              .showAdvanced=${this.hass.userData?.showAdvanced}
              @value-changed=${this._scriptDataChanged}
            ></ha-service-control>
          `
        : nothing}

      <hr />
      <div class="flex">
        <div>
          ${this.hass.localize(
            "ui.dialogs.more_info_control.script.last_triggered"
          )}:
        </div>
        ${this.stateObj.attributes.last_triggered
          ? html`
              <ha-relative-time
                .hass=${this.hass}
                .datetime=${this.stateObj.attributes.last_triggered}
                capitalize
              ></ha-relative-time>
            `
          : this.hass.localize("ui.components.relative_time.never")}
      </div>
    `;
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (!changedProperties.has("stateObj")) {
      return;
    }

    const oldState = changedProperties.get("stateObj") as
      | HassEntity
      | undefined;
    const newState = this.stateObj;

    if (newState && (!oldState || oldState.entity_id !== newState.entity_id)) {
      this._scriptData = { service: newState.entity_id, data: {} };
    }
  }

  private _cancelScript(ev: Event) {
    ev.stopPropagation();
    this._callService("turn_off");
  }

  private async _runScript(ev: Event) {
    ev.stopPropagation();
    this.hass.callService(
      "script",
      computeObjectId(this.stateObj!.entity_id),
      this._scriptData
    );
  }

  private _callService(service: string): void {
    this.hass.callService("script", service, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _scriptDataChanged(ev: CustomEvent): void {
    this._scriptData = { ...this._scriptData, ...ev.detail.value };
  }

  static get styles(): CSSResultGroup {
    return css`
      .flex {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      hr {
        border-color: var(--divider-color);
        border-bottom: none;
        margin: 16px 0;
      }
      ha-service-control {
        --service-control-padding: 0;
        --service-control-items-border-top: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-script": MoreInfoScript;
  }
}
