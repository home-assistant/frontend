import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import { css, CSSResultGroup, html, nothing, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { getBadgeElementClass } from "../../create-element/create-badge-element";
import type { LovelaceCardEditor, LovelaceConfigForm } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";
import "./hui-badge-visibility-editor";

const tabs = ["config", "visibility"] as const;

@customElement("hui-badge-element-editor")
export class HuiBadgeElementEditor extends HuiElementEditor<LovelaceBadgeConfig> {
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
    const newTab = tabs[ev.detail.index];
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
      <mwc-tab-bar
        .activeIndex=${tabs.indexOf(this._currTab)}
        @MDCTabBar:activated=${this._handleTabChanged}
      >
        ${tabs.map(
          (tab) => html`
            <mwc-tab
              .label=${this.hass.localize(
                `ui.panel.lovelace.editor.edit_badge.tab_${tab}`
              )}
            >
            </mwc-tab>
          `
        )}
      </mwc-tab-bar>
      ${content}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      HuiElementEditor.styles,
      css`
        mwc-tab-bar {
          text-transform: uppercase;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--divider-color);
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
