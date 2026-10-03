import { mdiPower, mdiPowerOff } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../state-control/ha-state-control-toggle";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

@customElement("more-info-input_boolean")
class MoreInfoInputBoolean extends LitElement {
  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this._localize || !this.stateObj) {
      return nothing;
    }

    return html`
      <ha-more-info-state-header
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls">
        <ha-state-control-toggle
          .stateObj=${this.stateObj}
          .iconPathOn=${mdiPower}
          .iconPathOff=${mdiPowerOff}
        ></ha-state-control-toggle>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return moreInfoControlStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-input_boolean": MoreInfoInputBoolean;
  }
}
