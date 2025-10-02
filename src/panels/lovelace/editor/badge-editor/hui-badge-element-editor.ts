import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { getBadgeElementClass } from "../../create-element/create-badge-element";
import type { LovelaceCardEditor, LovelaceConfigForm } from "../../types";
import { HuiTypedElementEditor } from "../hui-typed-element-editor";
import "./hui-badge-visibility-editor";

const tabs = ["config", "visibility"] as const;

@customElement("hui-badge-element-editor")
export class HuiBadgeElementEditor extends HuiTypedElementEditor<LovelaceBadgeConfig> {
  @state() private _currTab: (typeof tabs)[number] = tabs[0];

  protected async getConfigElement(): Promise<LovelaceCardEditor | undefined> {
    const elClass = await getBadgeElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    const elClass = await getBadgeElementClass(this.configElementType!);

    // Check if a schema exists
    if (elClass && elClass.getConfigForm) {
      return elClass.getConfigForm();
    }

    return undefined;
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.name;
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  private _configChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.value = ev.detail.value;
  }

  protected renderConfigElement(): TemplateResult {
    let content: TemplateResult<1> | typeof nothing = nothing;

    switch (this._currTab) {
      case "config":
        content = html`${super.renderConfigElement()}`;
        break;
      case "visibility":
        content = html`
          <hui-badge-visibility-editor
            .hass=${this.hass}
            .config=${this.value}
            @value-changed=${this._configChanged}
          ></hui-badge-visibility-editor>
        `;
        break;
    }
    return html`
      <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
        ${tabs.map(
          (tab) => html`
            <ha-tab-group-tab
              slot="nav"
              .panel=${tab}
              .active=${this._currTab === tab}
            >
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.edit_badge.tab_${tab}`
              )}
            </ha-tab-group-tab>
          `
        )}
      </ha-tab-group>
      ${content}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      HuiTypedElementEditor.styles,
      css`
        ha-tab-group {
          margin-bottom: 16px;
        }
        ha-tab-group-tab {
          flex: 1;
        }
        ha-tab-group-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-badge-element-editor": HuiBadgeElementEditor;
  }
}
