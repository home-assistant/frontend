import { mdiContentDuplicate, mdiDelete, mdiRenameBox } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import type { OptionSidebarConfig } from "../../../../data/automation";
import type { HomeAssistant } from "../../../../types";
import type HaAutomationConditionEditor from "../action/ha-automation-action-editor";
import { sidebarEditor } from "../styles";
import "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-option")
export default class HaAutomationSidebarOption extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: OptionSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @query(".sidebar-editor")
  public editor?: HaAutomationConditionEditor;

  protected render() {
    const disabled = this.disabled;

    const subtitle = this.hass.localize(
      "ui.panel.config.automation.editor.actions.type.choose.label"
    );

    const title = this.hass.localize(
      "ui.panel.config.automation.editor.actions.type.choose.option_label"
    );

    const description = this.hass.localize(
      "ui.panel.config.automation.editor.actions.type.choose.option_description"
    );

    return html`<ha-automation-sidebar-card
      .hass=${this.hass}
      .isWide=${this.isWide}
      .narrow=${this.narrow}
    >
      <span slot="title">${title}</span>
      <span slot="subtitle">${subtitle}</span>
      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this.config.rename}
        .disabled=${!!disabled}
      >
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.rename"
        )}
        <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
      </ha-md-menu-item>

      <ha-md-menu-item
        slot="menu-items"
        @click=${this.config.duplicate}
        .disabled=${this.disabled}
      >
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.duplicate"
        )}
        <ha-svg-icon slot="graphic" .path=${mdiContentDuplicate}></ha-svg-icon>
      </ha-md-menu-item>
      <ha-md-divider
        slot="menu-items"
        role="separator"
        tabindex="-1"
      ></ha-md-divider>
      <ha-md-menu-item
        slot="menu-items"
        .clickAction=${this.config.delete}
        .disabled=${this.disabled}
        class="warning"
      >
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.remove_option"
        )}
        <ha-svg-icon slot="start" .path=${mdiDelete}></ha-svg-icon>
      </ha-md-menu-item>
      <div class="description">${description}</div>
    </ha-automation-sidebar-card>`;
  }

  static styles = sidebarEditor;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-option": HaAutomationSidebarOption;
  }
}
