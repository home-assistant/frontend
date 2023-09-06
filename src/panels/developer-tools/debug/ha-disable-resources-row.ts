import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import type { HomeAssistant } from "../../../types";
import { storeState } from "../../../util/ha-pref-storage";

@customElement("ha-disable-resources-row")
class HaDisableResourcesRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.debug.disable_resources.title"
          )}
        </span>
        <span slot="description">
          ${this.hass.localize(
            "ui.panel.developer-tools.tabs.debug.disable_resources.description"
          )}
        </span>
        <ha-switch
          .checked=${this.hass.debugDisableResources}
          @change=${this._checkedChanged}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _checkedChanged(ev: Event) {
    const debugDisableResources = (ev.target as HaSwitch).checked;
    if (debugDisableResources === this.hass.debugDisableResources) {
      return;
    }
    this.hass.debugDisableResources = debugDisableResources;
    storeState(this.hass);
    location.reload();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-disable-resources-row": HaDisableResourcesRow;
  }
}
