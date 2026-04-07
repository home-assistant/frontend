import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import "../ha-icon";
import "../ha-svg-icon";
import "../ha-tab-group";
import "../ha-tab-group-tab";
import "./ha-form";
import type { HaForm } from "./ha-form";
import type {
  HaFormDataContainer,
  HaFormElement,
  HaFormSchema,
  HaFormTabsSchema,
} from "./types";

@customElement("ha-form-tabs")
export class HaFormTabs extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: HaFormTabsSchema;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public computeLabel?: (
    schema: HaFormSchema,
    data?: HaFormDataContainer,
    options?: { path?: string[]; tab?: string }
  ) => string;

  @property({ attribute: false }) public computeHelper?: (
    schema: HaFormSchema,
    options?: { path?: string[] }
  ) => string;

  @property({ attribute: false }) public localizeValue?: (
    key: string
  ) => string;

  @state() private _activeTab?: string;

  private _handleTabShow = (ev: CustomEvent<{ name: string }>) => {
    const name = ev.detail?.name;
    if (name !== undefined) {
      this._activeTab = name;
    }
  };

  protected willUpdate(changedProps: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("schema") && this.schema.tabs.length) {
      const first = this.schema.tabs[0]!.name;
      if (
        this._activeTab === undefined ||
        !this.schema.tabs.some((t) => t.name === this._activeTab)
      ) {
        this._activeTab = first;
      }
    }
  }

  public reportValidity(): boolean {
    const forms = this.renderRoot.querySelectorAll<HaForm>("ha-form");
    let valid = true;
    forms.forEach((form) => {
      if (!form.reportValidity()) {
        valid = false;
      }
    });
    return valid;
  }

  private _computeLabel = (
    schema: HaFormSchema,
    data?: HaFormDataContainer,
    options?: { path?: string[] }
  ) => {
    if (!this.computeLabel) {
      return undefined;
    }
    return this.computeLabel(schema, data, {
      ...options,
      path: [...(options?.path || []), this.schema.name],
    });
  };

  private _computeHelper = (
    schema: HaFormSchema,
    options?: { path?: string[] }
  ) => {
    if (!this.computeHelper) {
      return undefined;
    }
    return this.computeHelper(schema, {
      ...options,
      path: [...(options?.path || []), this.schema.name],
    });
  };

  private _tabTitle(tabName: string): string {
    if (!this.computeLabel) {
      return tabName;
    }
    return (
      this.computeLabel(this.schema, this.data, {
        path: [...(this.schema.name ? [this.schema.name] : [])],
        tab: tabName,
      }) ?? tabName
    );
  }

  protected render() {
    const tabs = this.schema.tabs;
    if (!tabs.length) {
      return nothing;
    }

    const active = this._activeTab ?? tabs[0]!.name;
    const fillTabs = this.schema.fill_tabs !== false;

    return html`
      <ha-tab-group ?fill-tabs=${fillTabs} @wa-tab-show=${this._handleTabShow}>
        ${tabs.map(
          (tab) => html`
            <ha-tab-group-tab
              slot="nav"
              .panel=${tab.name}
              .active=${active === tab.name}
            >
              ${tab.icon
                ? html`<ha-icon slot="start" .icon=${tab.icon}></ha-icon>`
                : tab.iconPath
                  ? html`
                      <ha-svg-icon
                        slot="start"
                        .path=${tab.iconPath}
                      ></ha-svg-icon>
                    `
                  : nothing}
              ${this._tabTitle(tab.name)}
            </ha-tab-group-tab>
          `
        )}
      </ha-tab-group>
      <div class="panels">
        ${tabs.map((tab) => {
          const hidden = active !== tab.name;
          return html`
            <div class="panel" ?hidden=${hidden}>
              <ha-form
                .hass=${this.hass}
                .data=${this.data}
                .schema=${tab.schema}
                .disabled=${this.disabled}
                .computeLabel=${this._computeLabel}
                .computeHelper=${this._computeHelper}
                .localizeValue=${this.localizeValue}
              ></ha-form>
            </div>
          `;
        })}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex !important;
      flex-direction: column;
    }
    .panels {
      padding-top: var(--ha-space-4);
    }
    .panel[hidden] {
      display: none !important;
    }
    :host ha-form {
      display: block;
    }
    ha-tab-group {
      display: block;
    }
    ha-icon,
    ha-svg-icon {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-tabs": HaFormTabs;
  }
}
