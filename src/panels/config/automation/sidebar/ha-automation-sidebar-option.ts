import { mdiDelete, mdiRenameBox } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import type { OptionSidebarConfig } from "../../../../data/automation";
import type { HomeAssistant } from "../../../../types";
import type HaAutomationConditionEditor from "../action/ha-automation-action-editor";
import "./ha-automation-sidebar-card";
import type { SidebarOverflowMenu } from "./ha-automation-sidebar-card";

@customElement("ha-automation-sidebar-option")
export default class HaAutomationSidebarOption extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: OptionSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

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
    const menuEntries: SidebarOverflowMenu = [
      {
        clickAction: this.config.rename,
        disabled: disabled,
        label: this.hass.localize(
          "ui.panel.config.automation.editor.triggers.rename"
        ),
        icon: mdiRenameBox,
      },
      "separator",
      {
        clickAction: this.config.delete,
        danger: true,
        disabled: this.disabled,
        label: this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.remove_option"
        ),
        icon: mdiDelete,
      },
    ];

    return html`<ha-automation-sidebar-card
      .hass=${this.hass}
      .isWide=${this.isWide}
      .menuEntries=${menuEntries}
    >
      <span slot="title">${title}</span>
      <span slot="subtitle">${subtitle}</span>
      ${description}
    </ha-automation-sidebar-card>`;
  }

  static styles = css`
    .sidebar-editor {
      padding-top: 64px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar-option": HaAutomationSidebarOption;
  }
}
