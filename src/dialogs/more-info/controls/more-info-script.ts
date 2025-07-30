import { mdiPlay, mdiStop } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-relative-time";
import "../../../components/ha-service-control";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/entity/state-info";
import type { HomeAssistant } from "../../../types";
import type { ScriptEntity } from "../../../data/script";
import { canRun } from "../../../data/script";
import { isUnavailableState } from "../../../data/entity";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { listenMediaQuery } from "../../../common/dom/media_query";
import "../components/ha-more-info-state-header";
import type { ExtEntityRegistryEntry } from "../../../data/entity_registry";
import "../../../components/ha-markdown";

@customElement("more-info-script")
class MoreInfoScript extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ScriptEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry;

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

    const script =
      this.hass.services.script[
        this.entry?.unique_id || computeObjectId(this.stateObj.entity_id)
      ];
    const fields = script?.fields;

    const hasFields = fields && Object.keys(fields).length > 0;

    const current = stateObj.attributes.current || 0;
    const isQueued = stateObj.attributes.mode === "queued";
    const isParallel = stateObj.attributes.mode === "parallel";
    const hasQueue = isQueued && current > 1;

    return html`
      <ha-more-info-state-header
        .stateObj=${stateObj}
        .hass=${this.hass}
        .stateOverride=${current > 0
          ? isParallel && current > 1
            ? this.hass.localize("ui.card.script.running_parallel", {
                active: current,
              })
            : this.hass.localize("ui.card.script.running_single")
          : this.hass.localize("ui.card.script.idle")}
        .changedOverride=${this.stateObj.attributes.last_triggered || 0}
      ></ha-more-info-state-header>

      ${script?.description
        ? html`<ha-markdown
            breaks
            .content=${script.description}
          ></ha-markdown>`
        : nothing}

      <div class=${`queue ${hasQueue ? "has-queue" : ""}`}>
        ${hasQueue
          ? html`
              ${this.hass.localize("ui.card.script.running_queued", {
                queued: current - 1,
              })}
            `
          : ""}
      </div>

      ${hasFields
        ? html`
            <div class="fields">
              <div class="title">
                ${this.hass.localize("ui.card.script.run_script")}
              </div>
              <ha-service-control
                hide-picker
                hide-description
                .hass=${this.hass}
                .value=${this._scriptData}
                .showAdvanced=${this.hass.userData?.showAdvanced}
                .narrow=${this.narrow}
                @value-changed=${this._scriptDataChanged}
              ></ha-service-control>
            </div>
          `
        : nothing}

      <ha-control-button-group>
        <ha-control-button
          @click=${this._cancelScript}
          .disabled=${!current}
          class="cancel-button"
        >
          <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
          ${(isQueued || isParallel) && current > 1
            ? this.hass.localize("ui.card.script.cancel_all")
            : this.hass.localize("ui.card.script.cancel")}
        </ha-control-button>
        <ha-control-button
          class="run-button"
          @click=${this._runScript}
          .disabled=${isUnavailableState(stateObj.state) || !this._canRun()}
        >
          <ha-svg-icon .path=${mdiPlay}></ha-svg-icon>
          ${this.hass!.localize("ui.card.script.run")}
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("stateObj")) {
      const oldState = changedProperties.get("stateObj") as
        | HassEntity
        | undefined;
      const newState = this.stateObj;

      if (
        newState &&
        (!oldState || oldState.entity_id !== newState.entity_id)
      ) {
        this._scriptData = {
          action:
            this.entry?.entity_id === newState.entity_id
              ? `script.${this.entry.unique_id}`
              : newState.entity_id,
        };
      }
    }

    if (this.entry?.unique_id && changedProperties.has("entry")) {
      const action = `script.${this.entry?.unique_id}`;
      if (this._scriptData?.action !== action) {
        this._scriptData = { ...this._scriptData, action };
      }
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
      this.entry?.unique_id || computeObjectId(this.stateObj!.entity_id),
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

  static styles = css`
    .queue {
      visibility: hidden;
      color: var(--secondary-text-color);
      text-align: center;
      margin-bottom: 16px;
      height: 21px;
    }
    .queue.has-queue {
      visibility: visible;
    }
    .fields {
      padding: 16px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .fields .title {
      font-weight: var(--ha-font-weight-bold);
    }
    ha-control-button ha-svg-icon {
      z-index: -1;
      margin-right: 4px;
    }
    ha-service-control {
      --service-control-padding: 0;
      --service-control-items-border-top: none;
    }
    ha-markdown {
      text-align: center;
      padding: 0 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-script": MoreInfoScript;
  }
}
