import type { TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { getCardElementClass } from "../../create-element/create-card-element";
import type { LovelaceCardEditor, LovelaceConfigForm } from "../../types";
import { HuiTypedElementEditor } from "../hui-typed-element-editor";
import "./hui-card-layout-editor";
import "./hui-card-visibility-editor";

const tabs = ["config", "visibility", "layout"] as const;

@customElement("hui-card-element-editor")
export class HuiCardElementEditor extends HuiTypedElementEditor<LovelaceCardConfig> {
  @property({ type: Boolean, attribute: "show-visibility-tab" })
  public showVisibilityTab = false;

  @property({ attribute: false }) public sectionConfig?: LovelaceSectionConfig;

  @state() private _currTab: (typeof tabs)[number] = tabs[0];

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

  private _configChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.value = ev.detail.value;
  }

  get _showLayoutTab(): boolean {
    return (
      !!this.sectionConfig &&
      (this.sectionConfig.type === undefined ||
        this.sectionConfig.type === "grid")
    );
  }

  protected renderConfigElement(): TemplateResult {
    const displayedTabs: string[] = ["config"];
    if (this.showVisibilityTab) displayedTabs.push("visibility");
    if (this._showLayoutTab) displayedTabs.push("layout");

    if (displayedTabs.length === 1) return super.renderConfigElement();

    let content: TemplateResult<1> | typeof nothing = nothing;

    switch (this._currTab) {
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
            .sectionConfig=${this.sectionConfig!}
            @value-changed=${this._configChanged}
          >
          </hui-card-layout-editor>
        `;
    }
    return html`
      <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
        ${displayedTabs.map(
          (tab) => html`
            <ha-tab-group-tab
              slot="nav"
              .active=${this._currTab === tab}
              panel=${tab}
            >
              ${this.hass.localize(
                `ui.panel.lovelace.editor.edit_card.tab_${tab}`
              )}
            </ha-tab-group-tab>
          `
        )}
      </ha-tab-group>
      ${content}
    `;
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.name;
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
  }

  static override styles = [
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

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-element-editor": HuiCardElementEditor;
  }
}
