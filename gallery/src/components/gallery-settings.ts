import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-switch";
import type { HaSwitch } from "../../../src/components/ha-switch";
import "../../../src/components/ha-theme-settings";
import type { HomeAssistant, ThemeSettings } from "../../../src/types";

@customElement("gallery-settings")
class GallerySettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public themeSettings!: ThemeSettings;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public rtl = false;

  protected render() {
    return html`
      <div class="content">
        <ha-card .header=${"Appearance"}>
          <div class="card-content">
            Configure how the gallery renders component previews and examples.
          </div>
          <ha-theme-settings
            .hass=${this.hass}
            .selectedTheme=${this.themeSettings}
            .narrow=${this.narrow}
            .heading=${"Theme"}
            .description=${"Choose the mode and colors used throughout the gallery."}
            .labels=${{
              mode: "Theme mode",
              autoMode: "Auto",
              lightMode: "Light",
              darkMode: "Dark",
              primaryColor: "Primary color",
              accentColor: "Accent color",
              reset: "Reset",
            }}
            .showThemePicker=${false}
          ></ha-theme-settings>
          <ha-settings-row .narrow=${this.narrow}>
            <span slot="heading">Right-to-left layout</span>
            <span slot="description">
              Preview the gallery with right-to-left text direction.
            </span>
            <ha-switch
              .checked=${this.rtl}
              @change=${this._rtlChanged}
            ></ha-switch>
          </ha-settings-row>
        </ha-card>
      </div>
    `;
  }

  private _rtlChanged(ev: Event) {
    fireEvent(this, "gallery-rtl-changed", {
      rtl: (ev.currentTarget as HaSwitch).checked,
    });
  }

  static styles = css`
    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: var(--ha-space-4);
    }

    ha-card {
      overflow: hidden;
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "gallery-rtl-changed": { rtl: boolean };
  }

  interface HTMLElementTagNameMap {
    "gallery-settings": GallerySettings;
  }
}
