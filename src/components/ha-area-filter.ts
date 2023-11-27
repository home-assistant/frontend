import { mdiPencil, mdiSofa } from "@mdi/js";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../types";
import "./ha-textfield";
import "./ha-svg-icon";
import { showAreaFilterDialog } from "../dialogs/area-filter/show-area-filter-dialog";
import { fireEvent } from "../common/dom/fire_event";

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

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

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
      <ha-textfield
        .label=${this.label}
        .value=${description}
        helperPersistent
        .helper=${this.helper}
        readOnly
        icon
        iconTrailing
        .disabled=${Boolean(this.disabled)}
        .required=${Boolean(this.required)}
        @click=${this._edit}
      >
        <ha-svg-icon slot="leadingIcon" .path=${mdiSofa}></ha-svg-icon>
        <ha-icon-button
          slot="trailingIcon"
          .label=${this.hass.localize("ui.common.edit")}
          .path=${mdiPencil}
          @click=${this._edit}
        ></ha-icon-button>
      </ha-textfield>
    `;
  }

  private async _edit(event: Event) {
    event.stopPropagation();
    const value = await showAreaFilterDialog(this, {
      title: this.label,
      initialValue: this.value,
    });
    if (!value) return;
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-textfield {
        width: 100%;
        user-select: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-filter": HaAreaPicker;
  }
}
