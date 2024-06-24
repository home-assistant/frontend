import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import { CSSResultGroup, TemplateResult, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { getCardElementClass } from "../../create-element/create-card-element";
import type { LovelaceCardEditor, LovelaceConfigForm } from "../../types";
import { HuiElementEditor } from "../hui-element-editor";
import "./hui-card-layout-editor";
import "./hui-card-visibility-editor";

type Tab = "config" | "visibility" | "layout";

@customElement("hui-card-element-editor")
export class HuiCardElementEditor extends HuiElementEditor<LovelaceCardConfig> {
  @state() private _curTab: Tab = "config";

  @property({ type: Boolean, attribute: "show-visibility-tab" })
  public showVisibilityTab = false;

  @property({ type: Boolean, attribute: "show-layout-tab" })
  public showLayoutTab = false;

  protected async getConfigElement(): Promise<LovelaceCardEditor | undefined> {
    const elClass = await getCardElementClass(this.configElementType!);

    // Check if a GUI editor exists
    if (elClass && elClass.getConfigElement) {
      return elClass.getConfigElement();
    }

    return undefined;
  }

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    const elClass = await getCardElementClass(this.configElementType!);

    // Check if a schema exists
    if (elClass && elClass.getConfigForm) {
      return elClass.getConfigForm();
    }

    return undefined;
  }

  private _handleTabSelected(ev: CustomEvent): void {
    if (!ev.detail.value) {
      return;
    }
    this._curTab = ev.detail.value.id;
  }

  private _configChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.value = ev.detail.value;
  }

  protected renderConfigElement(): TemplateResult {
    const displayedTabs: Tab[] = ["config"];
    if (this.showVisibilityTab) displayedTabs.push("visibility");
    if (this.showLayoutTab) displayedTabs.push("layout");

    if (displayedTabs.length === 1) return super.renderConfigElement();

    let content: TemplateResult<1> | typeof nothing = nothing;

    switch (this._curTab) {
      case "config":
        content = html`${super.renderConfigElement()}`;
        break;
      case "visibility":
        content = html`
          <hui-card-visibility-editor
            .hass=${this.hass}
            .config=${this.value}
            @value-changed=${this._configChanged}
          ></hui-card-visibility-editor>
        `;
        break;
      case "layout":
        content = html`
          <hui-card-layout-editor
            .hass=${this.hass}
            .config=${this.value}
            @value-changed=${this._configChanged}
          >
          </hui-card-layout-editor>
        `;
    }
    return html`
      <paper-tabs
        scrollable
        hide-scroll-buttons
        .selected=${displayedTabs.indexOf(this._curTab)}
        @selected-item-changed=${this._handleTabSelected}
      >
        ${displayedTabs.map(
          (tab, index) => html`
            <paper-tab id=${tab} .dialogInitialFocus=${index === 0}>
              ${this.hass.localize(
                `ui.panel.lovelace.editor.edit_card.tab_${tab}`
              )}
            </paper-tab>
          `
        )}
      </paper-tabs>
      ${content}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      HuiElementEditor.styles,
      css`
        paper-tabs {
          --paper-tabs-selection-bar-color: var(--primary-color);
          color: var(--primary-text-color);
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
    "hui-card-element-editor": HuiCardElementEditor;
  }
}
