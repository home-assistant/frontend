import { mdiTextureBox } from "@mdi/js";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { showAreaFilterDialog } from "../dialogs/area-filter/show-area-filter-dialog";
import { HomeAssistant } from "../types";
import "./ha-icon-next";
import "./ha-svg-icon";
import "./ha-textfield";

export type AreaFilterValue = {
  hidden?: string[];
  order?: string[];
};

@customElement("ha-area-filter")
export class HaAreaPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: AreaFilterValue;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  protected render(): TemplateResult {
    const allAreasCount = Object.keys(this.hass.areas).length;
    const hiddenAreasCount = this.value?.hidden?.length ?? 0;

    const description =
      hiddenAreasCount === 0
        ? this.hass.localize("ui.components.area-filter.all_areas")
        : allAreasCount === hiddenAreasCount
          ? this.hass.localize("ui.components.area-filter.no_areas")
          : this.hass.localize("ui.components.area-filter.area_count", {
              count: allAreasCount - hiddenAreasCount,
            });

    return html`
      <ha-list-item
        tabindex="0"
        role="button"
        hasMeta
        twoline
        graphic="icon"
        @click=${this._edit}
        @keydown=${this._edit}
        .disabled=${this.disabled}
      >
        <ha-svg-icon slot="graphic" .path=${mdiTextureBox}></ha-svg-icon>
        <span>${this.label}</span>
        <span slot="secondary">${description}</span>
        <ha-icon-next
          slot="meta"
          .label=${this.hass.localize("ui.common.edit")}
        ></ha-icon-next>
      </ha-list-item>
    `;
  }

  private async _edit(ev) {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    const value = await showAreaFilterDialog(this, {
      title: this.label,
      initialValue: this.value,
    });
    if (!value) return;
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-list-item {
        --mdc-list-side-padding-left: 8px;
        --mdc-list-side-padding-right: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-filter": HaAreaPicker;
  }
}
