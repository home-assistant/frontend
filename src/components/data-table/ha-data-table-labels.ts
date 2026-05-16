import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { ResizeController } from "@lit-labs/observers/resize-controller";
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

  @state() private _visibleCount = 0;

  @query(".viewport") private _viewport?: HTMLDivElement;
  @query(".measure") private _measure?: HTMLDivElement;

  private _sortedLabels: LabelRegistryEntry[] = [];

  private _chipWidths: number[] = [];
  private _plusWidth = 0;
  private _gap = 8;

  private _resizeController = new ResizeController(this, {
    target: null,
    skipInitial: true,
    callback: (entries) => {
      const entry = entries[0];
      const width = entry?.contentRect.width ?? 0;
      this._recomputeVisibleCount(width);
      return width;
    },
  });

  protected willUpdate(changedProps: Map<string, unknown>) {
    if (changedProps.has("labels")) {
      this._sortedLabels = [...this.labels].sort((a, b) =>
        stringCompare(a.name, b.name)
      );
    }
  }

  protected render(): TemplateResult {
    const labels = this._sortedLabels;
    const visible = labels.slice(0, this._visibleCount);
    const hidden = labels.length - this._visibleCount;

    return html`
      <div class="viewport">
        <ha-chip-set>
          ${repeat(
            visible,
            (label) => label.label_id,
            (label) => this._renderLabel(label, true)
          )}
          ${hidden > 0
            ? html`
                <ha-dropdown
                  role="button"
                  tabindex="0"
                  @click=${stopPropagation}
                  @wa-select=${this._handleDropdownSelect}
                >
                  <ha-label slot="trigger" class="plus" dense>
                    +${hidden}
                  </ha-label>
                  ${repeat(
                    labels.slice(this._visibleCount),
                    (label) => label.label_id,
                    (label) => html`
                      <ha-dropdown-item .value=${label.label_id} .item=${label}>
                        ${this._renderLabel(label, false)}
                      </ha-dropdown-item>
                    `
                  )}
                </ha-dropdown>
              `
            : nothing}
        </ha-chip-set>
      </div>

      <div class="measure" aria-hidden="true">
        <ha-chip-set>
          ${repeat(
            labels,
            (label) => label.label_id,
            (label) => html`
              <div class="measure-chip" data-chip>
                ${this._renderLabel(label, false)}
              </div>
            `
          )}
          <div class="measure-chip" data-plus>
            <ha-label class="plus" dense>+999</ha-label>
          </div>
        </ha-chip-set>
      </div>
    `;
  }

  protected async firstUpdated() {
    await this.updateComplete;
    if (this._viewport) {
      this._resizeController.observe(this._viewport);
    }
    await this._measureWidths();
    this._recomputeVisibleCount(this._viewport?.clientWidth ?? 0);
  }

  protected async updated(changedProps: Map<string, unknown>) {
    if (changedProps.has("labels")) {
      await this.updateComplete;
      await this._measureWidths();
      this._recomputeVisibleCount(this._viewport?.clientWidth ?? 0);
    }
  }

  private async _measureWidths() {
    await this.updateComplete;

    const measureRoot = this._measure;
    if (!measureRoot) {
      return;
    }

    const measureChipSet = measureRoot.querySelector("ha-chip-set");
    if (measureChipSet) {
      const styles = getComputedStyle(measureChipSet);
      const raw = styles.columnGap || styles.gap;
      this._gap = raw ? parseFloat(raw) : 0;
    }

    const chipEls = Array.from(
      measureRoot.querySelectorAll<HTMLElement>("[data-chip]")
    );
    const plusEl = measureRoot.querySelector<HTMLElement>("[data-plus]");

    this._chipWidths = chipEls.map((el) => el.offsetWidth);
    this._plusWidth = plusEl?.offsetWidth ?? 0;
  }

  private _recomputeVisibleCount(containerWidth: number) {
    if (!containerWidth || !this.labels?.length) {
      this._visibleCount = 0;
      return;
    }

    const total = this._sortedLabels.length;

    let used = 0;
    let visibleCount = 0;

    for (let i = 0; i < total; i++) {
      const chipWidth = this._chipWidths[i] ?? 0;
      const nextUsed =
        visibleCount === 0 ? chipWidth : used + this._gap + chipWidth;
      const remaining = total - (i + 1);
      const reserve = remaining > 0 ? this._gap + this._plusWidth : 0;

      if (nextUsed + reserve <= containerWidth) {
        used = nextUsed;
        visibleCount++;
      } else {
        break;
      }
    }
    this._visibleCount = visibleCount;
  }

  private _renderLabel(label: LabelRegistryEntry, clickAction: boolean) {
    return html`
      <ha-label
        dense
        role="button"
        tabindex="0"
        .color=${label.color}
        .item=${label}
        @click=${clickAction ? this._labelClicked : undefined}
        @keydown=${clickAction ? this._labelClicked : undefined}
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
      min-width: 0;
      margin-top: 4px;
      height: 22px;
      position: relative;
    }

    .viewport {
      min-width: 0;
      width: 100%;
      overflow: hidden;
    }

    ha-chip-set {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      overflow: hidden;
      min-width: 0;
    }

    .measure {
      position: absolute;
      inset: 0 auto auto 0;
      visibility: hidden;
      pointer-events: none;
      white-space: nowrap;
    }

    .measure ha-chip-set {
      width: max-content;
      overflow: visible;
    }

    .measure-chip {
      display: inline-flex;
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
