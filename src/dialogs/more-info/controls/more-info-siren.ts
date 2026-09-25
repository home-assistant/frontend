import { mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../state-control/ha-state-control-toggle";
import "../../../components/ha-button";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { SirenEntityFeature } from "../../../data/siren";
import { showSirenAdvancedControlsView } from "../components/siren/show-dialog-siren-advanced-controls";

@customElement("more-info-siren")
class MoreInfoSiren extends LitElement {
  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this._localize || !this.stateObj) {
      return nothing;
    }

    const supportsTones =
      supportsFeature(this.stateObj, SirenEntityFeature.TONES) &&
      this.stateObj.attributes.available_tones;
    const supportsVolume = supportsFeature(
      this.stateObj,
      SirenEntityFeature.VOLUME_SET
    );
    const supportsDuration = supportsFeature(
      this.stateObj,
      SirenEntityFeature.DURATION
    );
    // show advanced controls dialog if extra features are supported
    const allowAdvanced = supportsTones || supportsVolume || supportsDuration;

    return html`
      <ha-more-info-state-header
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls">
        <ha-state-control-toggle
          .stateObj=${this.stateObj}
          .iconPathOn=${mdiVolumeHigh}
          .iconPathOff=${mdiVolumeOff}
        ></ha-state-control-toggle>
        ${
          allowAdvanced
            ? html`<ha-button
                appearance="plain"
                size="s"
                @click=${this._showAdvancedControlsDialog}
              >
                ${this._localize("ui.components.siren.more_controls")}
              </ha-button>`
            : nothing
        }
      </div>
    `;
  }

  private _showAdvancedControlsDialog() {
    showSirenAdvancedControlsView(this, this.stateObj!);
  }

  static get styles(): CSSResultGroup {
    return moreInfoControlStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-siren": MoreInfoSiren;
  }
}
