import { mdiDelete } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import { mdiHomeAssistant } from "../../../../src/resources/home-assistant-logo-svg";
import "../../../../src/components/ha-dropdown-item";
import "@home-assistant/webawesome/dist/components/icon/icon";
import "@home-assistant/webawesome/dist/components/button/button";
import "@home-assistant/webawesome/dist/components/dropdown/dropdown";
import "../../../../src/components/ha-dropdown";
import "@home-assistant/webawesome/dist/components/popup/popup";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";

@customElement("demo-components-ha-dropdown")
export class DemoHaDropdown extends LitElement {
  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <wa-popup></wa-popup>
            <ha-card header="ha-button in ${mode}">
              <div class="card-content">
                <ha-dropdown open>
                  <ha-button slot="trigger" with-caret>Dropdown</ha-button>

                  <ha-dropdown-item>
                    <ha-svg-icon
                      .path=${mdiHomeAssistant}
                      slot="icon"
                    ></ha-svg-icon>
                    Cut
                  </ha-dropdown-item>
                  <ha-dropdown-item>
                    <ha-svg-icon
                      .path=${mdiHomeAssistant}
                      slot="icon"
                    ></ha-svg-icon>
                    Copy
                  </ha-dropdown-item>
                  <ha-dropdown-item>
                    <ha-svg-icon
                      .path=${mdiHomeAssistant}
                      slot="icon"
                    ></ha-svg-icon>
                    Paste
                  </ha-dropdown-item>
                  <ha-dropdown-item>
                    Show images
                    <ha-dropdown-item slot="submenu" value="show-all-images"
                      >Show All Images</ha-dropdown-item
                    >
                    <ha-dropdown-item slot="submenu" value="show-thumbnails"
                      >Show Thumbnails</ha-dropdown-item
                    >
                  </ha-dropdown-item>
                  <ha-dropdown-item type="checkbox" checked
                    >Emoji Shortcuts</ha-dropdown-item
                  >
                  <ha-dropdown-item type="checkbox" checked
                    >Word Wrap</ha-dropdown-item
                  >
                  <ha-dropdown-item variant="danger">
                    <ha-svg-icon .path=${mdiDelete} slot="start"></ha-svg-icon>
                    Delete
                  </ha-dropdown-item>
                </ha-dropdown>

                <wa-dropdown>
                  <wa-button slot="trigger" with-caret>Dropdown</wa-button>

                  <wa-dropdown-item>
                    <wa-icon slot="icon" name="scissors"></wa-icon>
                    Cut
                  </wa-dropdown-item>
                  <wa-dropdown-item>
                    <wa-icon slot="icon" name="copy"></wa-icon>
                    Copy
                  </wa-dropdown-item>
                  <wa-dropdown-item>
                    <wa-icon slot="icon" name="paste"></wa-icon>
                    Paste
                  </wa-dropdown-item>
                  <wa-dropdown-item>
                    Show images
                    <wa-dropdown-item slot="submenu" value="show-all-images"
                      >Show All Images</wa-dropdown-item
                    >
                    <wa-dropdown-item slot="submenu" value="show-thumbnails"
                      >Show Thumbnails</wa-dropdown-item
                    >
                  </wa-dropdown-item>
                  <wa-dropdown-item type="checkbox" checked
                    >Emoji Shortcuts</wa-dropdown-item
                  >
                  <wa-dropdown-item type="checkbox" checked
                    >Word Wrap</wa-dropdown-item
                  >
                  <wa-dropdown-item variant="danger">
                    <wa-icon slot="icon" name="trash"></wa-icon>
                    Delete
                  </wa-dropdown-item>
                </wa-dropdown>
              </div>
            </ha-card>
          </div>
        `
      )}
    `;
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    applyThemesOnElement(
      this.shadowRoot!.querySelector(".dark"),
      {
        default_theme: "default",
        default_dark_theme: "default",
        themes: {},
        darkMode: true,
        theme: "default",
      },
      undefined,
      undefined,
      true
    );
  }

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
    }
    .dark,
    .light {
      display: block;
      background-color: var(--primary-background-color);
      padding: 0 50px;
    }
    .button {
      padding: unset;
    }
    ha-card {
      margin: 24px auto;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .card-content div {
      display: flex;
      gap: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-dropdown": DemoHaDropdown;
  }
}
