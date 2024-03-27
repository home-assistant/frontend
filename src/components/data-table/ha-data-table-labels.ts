import { css, html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../chips/ha-assist-chip";
import { repeat } from "lit/directives/repeat";
import { LabelRegistryEntry } from "../../data/label_registry";
import { computeCssColor } from "../../common/color/compute-color";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-data-table-labels")
class HaDataTableLabels extends LitElement {
  @property({ attribute: false }) public labels!: LabelRegistryEntry[];

  protected render(): TemplateResult {
    return html`
      <ha-chip-set>
        ${repeat(
          this.labels.slice(0, 2),
          (label) => label.label_id,
          (label) => this._renderLabel(label, true)
        )}
        ${this.labels.length > 2
          ? html`<ha-button-menu
              absolute
              @click=${this._handleIconOverflowMenuOpened}
              @closed=${this._handleIconOverflowMenuClosed}
            >
              <ha-assist-chip
                slot="trigger"
                .label=${`+${this.labels.length - 2}`}
              ></ha-assist-chip>
              ${repeat(
                this.labels.slice(2),
                (label) => label.label_id,
                (label) =>
                  html`<ha-list-item
                    @click=${this._labelClicked}
                    .item=${label}
                  >
                    ${this._renderLabel(label, false)}
                  </ha-list-item>`
              )}
            </ha-button-menu>`
          : nothing}
      </ha-chip-set>
    `;
  }

  private _renderLabel(label: LabelRegistryEntry, clickAction: boolean) {
    const color = label?.color ? computeCssColor(label.color) : undefined;
    return html`<ha-assist-chip
      .item=${label}
      @click=${clickAction ? this._labelClicked : undefined}
      .label=${label?.name}
      active
      style=${color ? `--color: ${color}` : ""}
    >
      ${label?.icon
        ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>`
        : nothing}
    </ha-assist-chip>`;
  }

  private _labelClicked(ev: Event) {
    const label = (ev.currentTarget as any).item as LabelRegistryEntry;
    fireEvent(this, "label-clicked", { label });
  }

  protected _handleIconOverflowMenuOpened(e) {
    e.stopPropagation();
    // If this component is used inside a data table, the z-index of the row
    // needs to be increased. Otherwise the ha-button-menu would be displayed
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

  static get styles() {
    return css`
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
      ha-assist-chip {
        border: 1px solid var(--color);
        --md-assist-chip-icon-size: 16px;
        --md-assist-chip-container-height: 20px;
        --md-assist-chip-leading-space: 12px;
        --md-assist-chip-trailing-space: 12px;
        --ha-assist-chip-active-container-color: var(--color);
        --ha-assist-chip-active-container-opacity: 0.3;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table-labels": HaDataTableLabels;
  }
  interface HASSDomEvents {
    "label-clicked": { label: LabelRegistryEntry };
  }
}
