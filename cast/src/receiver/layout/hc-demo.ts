import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mockHistory } from "../../../../demo/src/stubs/history";
import { LovelaceConfig } from "../../../../src/data/lovelace";
import {
  MockHomeAssistant,
  provideHass,
} from "../../../../src/fake_data/provide_hass";
import { HassElement } from "../../../../src/state/hass-element";
import { HomeAssistant } from "../../../../src/types";
import { castDemoEntities } from "../demo/cast-demo-entities";
import { castDemoLovelace } from "../demo/cast-demo-lovelace";
import "./hc-lovelace";

@customElement("hc-demo")
class HcDemo extends HassElement {
  @property({ attribute: false }) public lovelacePath!: string;

  @state() private _lovelaceConfig?: LovelaceConfig;

  protected render() {
    if (!this._lovelaceConfig) {
      return nothing;
    }
    return html`
      <hc-lovelace
        .hass=${this.hass}
        .lovelaceConfig=${this._lovelaceConfig}
        .viewPath=${this.lovelacePath}
      ></hc-lovelace>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._initializeHass();
  }

  private async _initializeHass() {
    const initial: Partial<MockHomeAssistant> = {
      // Override updateHass so that the correct hass lifecycle methods are called
      updateHass: (hassUpdate: Partial<HomeAssistant>) =>
        this._updateHass(hassUpdate),
    };

    const hass = (this.hass = provideHass(this, initial));

    mockHistory(hass);

    hass.addEntities(castDemoEntities());
    this._lovelaceConfig = castDemoLovelace();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-demo": HcDemo;
  }
}
