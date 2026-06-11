import { consume, type ContextType } from "@lit/context";
import { mdiStop, mdiValveClosed, mdiValveOpen } from "@mdi/js";
import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { supportsFeature } from "../common/entity/supports-feature";
import type { LocalizeFunc } from "../common/translations/localize";
import { apiContext } from "../data/context";
import type { ValveEntity } from "../data/valve";
import { ValveEntityFeature, canClose, canOpen, canStop } from "../data/valve";
import "./ha-icon-button";

@customElement("ha-valve-controls")
class HaValveControls extends LitElement {
  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @property({ attribute: false }) public stateObj!: ValveEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    return html`
      <div class="state">
        <ha-icon-button
          class=${classMap({
            hidden: !supportsFeature(this.stateObj, ValveEntityFeature.OPEN),
          })}
          .label=${this._localize("ui.card.valve.open_valve")}
          @click=${this._onOpenTap}
          .disabled=${!canOpen(this.stateObj)}
          .path=${mdiValveOpen}
        >
        </ha-icon-button>
        <ha-icon-button
          class=${classMap({
            hidden: !supportsFeature(this.stateObj, ValveEntityFeature.STOP),
          })}
          .label=${this._localize("ui.card.valve.stop_valve")}
          @click=${this._onStopTap}
          .disabled=${!canStop(this.stateObj)}
          .path=${mdiStop}
        ></ha-icon-button>
        <ha-icon-button
          class=${classMap({
            hidden: !supportsFeature(this.stateObj, ValveEntityFeature.CLOSE),
          })}
          .label=${this._localize("ui.card.valve.close_valve")}
          @click=${this._onCloseTap}
          .disabled=${!canClose(this.stateObj)}
          .path=${mdiValveClosed}
        >
        </ha-icon-button>
      </div>
    `;
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this._api.callService("valve", "open_valve", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this._api.callService("valve", "close_valve", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this._api.callService("valve", "stop_valve", {
      entity_id: this.stateObj.entity_id,
    });
  }

  static styles = css`
    :host {
      display: block;
    }
    .state {
      white-space: nowrap;
    }
    .hidden {
      visibility: hidden !important;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-valve-controls": HaValveControls;
  }
}
