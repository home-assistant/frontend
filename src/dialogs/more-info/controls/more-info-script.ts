import { mdiPlay } from "@mdi/js";
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
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-relative-time";
import "../../../components/ha-service-control";
import "../../../components/ha-button";
import "../../../components/entity/state-info";
import { HomeAssistant } from "../../../types";
import { canRun, ScriptEntity } from "../../../data/script";
import { isUnavailableState } from "../../../data/entity";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { listenMediaQuery } from "../../../common/dom/media_query";

@customElement("more-info-script")
class MoreInfoScript extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ScriptEntity;

  @state() private _scriptData: Record<string, any> = {};

  @state() private narrow = false;

  private _unsubMediaQuery?: () => void;

  public connectedCallback(): void {
    super.connectedCallback();
    this._unsubMediaQuery = listenMediaQuery(
      "(max-width: 870px)",
      (matches) => {
        this.narrow = matches;
      }
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unsubMediaQuery) {
      this._unsubMediaQuery();
      this._unsubMediaQuery = undefined;
    }
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj;

    const fields =
      this.hass.services.script[computeObjectId(this.stateObj.entity_id)]
        ?.fields;

    const hasFields = fields && Object.keys(fields).length > 0;

    const current = stateObj.attributes.current || 0;
    const isQueued = stateObj.attributes.mode === "queued";
    const isParallel = stateObj.attributes.mode === "parallel";
    const hasQueue = isQueued && current > 1;

    return html`
      <div class="state">
        <h2>
          ${current > 0
            ? html`
                ${isParallel && current > 1
                  ? this.hass.localize("ui.card.script.running_parallel", {
                      active: current,
                    })
                  : this.hass.localize("ui.card.script.running_single")}
              `
            : this.hass.localize("ui.card.script.idle")}
        </h2>
        <div class=${`queue ${hasQueue ? "has-queue" : ""}`}>
          ${hasQueue
            ? html`
                ${this.hass.localize("ui.card.script.running_queued", {
                  queued: current - 1,
                })}
              `
            : "&nbsp;"}
        </div>

        <ha-button
          class=${current > 0 ? "can-cancel" : ""}
          raised
          @click=${this._cancelScript}
        >
          ${(isQueued || isParallel) && current > 1
            ? this.hass.localize("ui.card.script.cancel_all")
            : this.hass.localize("ui.card.script.cancel")}
        </ha-button>
      </div>

      <div class="run">
        <div class="title">
          ${this.hass.localize("ui.card.script.run_script")}
        </div>

        ${hasFields
          ? html`
              <ha-service-control
                hidePicker
                hideDescription
                .hass=${this.hass}
                .value=${this._scriptData}
                .showAdvanced=${this.hass.userData?.showAdvanced}
                .narrow=${this.narrow}
                @value-changed=${this._scriptDataChanged}
              ></ha-service-control>
            `
          : nothing}

        <div class="run-button">
          <ha-button
            raised
            @click=${this._runScript}
            .disabled=${isUnavailableState(stateObj.state) || !this._canRun()}
          >
            <ha-svg-icon .path=${mdiPlay} slot="icon"></ha-svg-icon>
            ${this.hass!.localize("ui.card.script.run")}
          </ha-button>
        </div>
      </div>

      <div class="footer">
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
      this._scriptData.data
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

  private _canRun() {
    if (
      canRun(this.stateObj!) ||
      // Restart can also always runs. Just cancels other run.
      this.stateObj!.attributes.mode === "restart"
    ) {
      return true;
    }
    return false;
  }

  static get styles(): CSSResultGroup {
    return css`
      .state {
        text-align: center;
        margin: 2em 16px 1em;
      }
      .state .queue {
        visibility: hidden;
        color: var(--secondary-text-color);
      }
      .state .queue.has-queue {
        visibility: visible;
      }
      .state ha-button {
        margin-top: 16px;
        --mdc-theme-primary: var(--error-color);
        visibility: hidden;
      }
      .state ha-button.can-cancel {
        visibility: visible;
      }
      .run {
        margin: 8px;
        padding: 16px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
      }
      .run .title {
        font-weight: bold;
      }
      .run-button {
        margin-top: 16px;
        text-align: center;
      }
      .footer {
        margin-top: 24px;
        text-align: center;
      }
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
