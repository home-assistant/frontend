import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LovelaceViewSidebarConfig } from "../../../data/lovelace/config/view";
import { ConditionalListenerMixin } from "../../../mixins/conditional-listener-mixin";
import type { HomeAssistant } from "../../../types";
import { checkConditionsMet } from "../common/validate-condition";
import "../sections/hui-section";
import type { Lovelace } from "../types";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";

export const DEFAULT_VIEW_SIDEBAR_LAYOUT = "start";

@customElement("hui-view-sidebar")
export class HuiViewSidebar extends ConditionalListenerMixin<LovelaceViewSidebarConfig>(
  LitElement
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public config?: LovelaceViewSidebarConfig;

  @property({ attribute: false }) public viewIndex!: number;

  private _visible = true;

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("hass") || changedProperties.has("config")) {
      this._updateVisibility();
    }
  }

  protected _updateVisibility(conditionsMet?: boolean) {
    if (!this.hass || !this.config) return;

    const visible =
      conditionsMet ??
      (!this.config.visibility ||
        checkConditionsMet(this.config.visibility, this.hass));

    if (visible !== this._visible) {
      this._visible = visible;
      fireEvent(this, "sidebar-visibility-changed", { visible });
    }
  }

  private _sectionConfigKeys = new WeakMap<LovelaceSectionConfig, string>();

  private _getSectionKey(section: LovelaceSectionConfig) {
    if (!this._sectionConfigKeys.has(section)) {
      this._sectionConfigKeys.set(section, Math.random().toString());
    }
    return this._sectionConfigKeys.get(section)!;
  }

  render() {
    if (!this.lovelace) return nothing;

    // Use preview mode instead of setting lovelace to avoid the sections to be
    // editable as it is not yet supported
    return html`
      <div class="container">
        ${repeat(
          this.config?.sections ?? [],
          (section) => this._getSectionKey(section),
          (section) => html`
            <hui-section
              .config=${section}
              .hass=${this.hass}
              .preview=${this.lovelace.editMode}
              .viewIndex=${this.viewIndex}
            ></hui-section>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    .container {
      display: flex;
      flex-direction: column;
      gap: var(--row-gap, 8px);
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-sidebar": HuiViewSidebar;
  }
  interface HASSDomEvents {
    "sidebar-visibility-changed": { visible: boolean };
  }
}
