import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { LabelRegistryEntry } from "../../data/label_registry";
import { computeCssColor } from "../../common/color/compute-color";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-label";
import { stringCompare } from "../../common/string/compare";
import "../chips/ha-chip-set";
import "../ha-md-button-menu";
import "../ha-md-menu-item";
import "../ha-icon";

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
          ? html`<ha-md-button-menu
              positioning="absolute"
              role="button"
              tabindex="0"
              @click=${this._handleIconOverflowMenuOpened}
              @closed=${this._handleIconOverflowMenuClosed}
            >
              <ha-label slot="trigger" class="plus" dense>
                +${labels.length - 2}
              </ha-label>
              ${repeat(
                labels.slice(2),
                (label) => label.label_id,
                (label) => html`
                  <ha-md-menu-item @click=${this._labelClicked} .item=${label}>
                    ${this._renderLabel(label, false)}
                  </ha-md-menu-item>
                `
              )}
            </ha-md-button-menu>`
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

  protected _handleIconOverflowMenuOpened(e) {
    e.stopPropagation();
    // If this component is used inside a data table, the z-index of the row
    // needs to be increased. Otherwise the ha-md-button-menu would be displayed
    // underneath the next row in the table.
    const row = this.closest(".mdc-data-table__row") as HTMLDivElement | null;
    if (row) {
      row.style.zIndex = "1";
    }
  }

  protected _handleIconOverflowMenuClosed() {
    const row = this.closest(".mdc-data-table__row") as HTMLDivElement | null;
    if (row) {
      row.style.zIndex = "";
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
    ha-md-button-menu {
      border-radius: 10px;
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
