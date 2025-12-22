import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { computeCssColor } from "../../common/color/compute-color";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { stringCompare } from "../../common/string/compare";
import type { LabelRegistryEntry } from "../../data/label/label_registry";
import "../chips/ha-chip-set";
import "../ha-dropdown";
import "../ha-dropdown-item";
import type { HaDropdownItem } from "../ha-dropdown-item";
import "../ha-icon";
import "../ha-label";

@customElement("ha-data-table-labels")
class HaDataTableLabels extends LitElement {
  @property({ attribute: false }) public labels!: LabelRegistryEntry[];

  protected render(): TemplateResult {
    const labels = this.labels.sort((a, b) => stringCompare(a.name, b.name));
    return html`
      <ha-chip-set>
        ${repeat(
          labels.slice(0, 2),
          (label) => label.label_id,
          (label) => this._renderLabel(label, true)
        )}
        ${labels.length > 2
          ? html`<ha-dropdown
              role="button"
              tabindex="0"
              @click=${stopPropagation}
              @wa-select=${this._handleDropdownSelect}
            >
              <ha-label slot="trigger" class="plus" dense>
                +${labels.length - 2}
              </ha-label>
              ${repeat(
                labels.slice(2),
                (label) => label.label_id,
                (label) => html`
                  <ha-dropdown-item .value=${label.label_id} .item=${label}>
                    ${this._renderLabel(label, false)}
                  </ha-dropdown-item>
                `
              )}
            </ha-dropdown>`
          : nothing}
      </ha-chip-set>
    `;
  }

  private _renderLabel(label: LabelRegistryEntry, clickAction: boolean) {
    const color = label?.color ? computeCssColor(label.color) : undefined;
    return html`
      <ha-label
        dense
        role="button"
        tabindex="0"
        .item=${label}
        @click=${clickAction ? this._labelClicked : undefined}
        @keydown=${clickAction ? this._labelClicked : undefined}
        style=${color ? `--color: ${color}` : ""}
        .description=${label.description}
      >
        ${label?.icon
          ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>`
          : nothing}
        ${label.name}
      </ha-label>
    `;
  }

  private _labelClicked(ev) {
    ev.stopPropagation();
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    const label = (ev.currentTarget as any).item as LabelRegistryEntry;
    fireEvent(this, "label-clicked", { label });
  }

  private _handleDropdownSelect(
    ev: CustomEvent<{ item: HaDropdownItem & { item?: LabelRegistryEntry } }>
  ) {
    const label = ev.detail?.item?.item;
    if (label) {
      fireEvent(this, "label-clicked", { label });
    }
  }

  static styles = css`
    :host {
      display: block;
      flex-grow: 1;
      margin-top: 4px;
      height: 22px;
    }
    ha-chip-set {
      position: fixed;
      flex-wrap: nowrap;
    }
    ha-label {
      --ha-label-background-color: var(--color, var(--grey-color));
      --ha-label-background-opacity: 0.5;
    }
    .plus {
      --ha-label-background-color: transparent;
      border: 1px solid var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table-labels": HaDataTableLabels;
  }
  interface HASSDomEvents {
    "label-clicked": { label: LabelRegistryEntry };
  }
}
