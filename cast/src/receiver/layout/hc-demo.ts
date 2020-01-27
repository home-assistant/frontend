import { HassElement } from "../../../../src/state/hass-element";
import "./hc-lovelace";
import { customElement, TemplateResult, html, property } from "lit-element";
import {
  MockHomeAssistant,
  provideHass,
} from "../../../../src/fake_data/provide_hass";
import { HomeAssistant } from "../../../../src/types";
import { LovelaceConfig } from "../../../../src/data/lovelace";
import { castDemoEntities } from "../demo/cast-demo-entities";
import { castDemoLovelace } from "../demo/cast-demo-lovelace";
import { mockHistory } from "../../../../demo/src/stubs/history";

@customElement("hc-demo")
class HcDemo extends HassElement {
  @property() public lovelacePath!: string;
  @property() private _lovelaceConfig?: LovelaceConfig;

  protected render(): TemplateResult {
    if (!this._lovelaceConfig) {
      return html``;
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
    this._initialize();
  }

  private async _initialize() {
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
