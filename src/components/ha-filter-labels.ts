import { SelectedDetail } from "@material/mwc-list";
import "@material/mwc-menu/mwc-menu-surface";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiPlus } from "@mdi/js";
import { computeCssColor } from "../common/color/compute-color";
import { fireEvent } from "../common/dom/fire_event";
import {
  LabelRegistryEntry,
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../data/label_registry";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-label";
import { showLabelDetailDialog } from "../panels/config/labels/show-dialog-label-detail";

@customElement("ha-filter-labels")
export class HaFilterLabels extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _labels: LabelRegistryEntry[] = [];

  @state() private _shouldRender = false;

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        this._labels = labels;
      }),
    ];
  }

  protected render() {
    return html`
      <ha-expansion-panel
        leftChevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.labels.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>`
            : nothing}
        </div>
        ${this._shouldRender
          ? html`
              <mwc-list
                @selected=${this._labelSelected}
                class="ha-scrollbar"
                multi
              >
                ${this._labels.map((label) => {
                  const color = label.color
                    ? computeCssColor(label.color)
                    : undefined;
                  return html`<ha-check-list-item
                    .value=${label.label_id}
                    .selected=${this.value?.includes(label.label_id)}
                    hasMeta
                  >
                    <ha-label style=${color ? `--color: ${color}` : ""}>
                      ${label.icon
                        ? html`<ha-icon
                            slot="icon"
                            .icon=${label.icon}
                          ></ha-icon>`
                        : nothing}
                      ${label.name}
                    </ha-label>
                  </ha-check-list-item>`;
                })}
              </mwc-list>
            `
          : nothing}
      </ha-expansion-panel>
      ${this.expanded
        ? html`<ha-list-item graphic="icon" @click=${this._addLabel}>
            <ha-svg-icon slot="graphic" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.labels.add_label")}
          </ha-list-item>`
        : nothing}
    `;
  }

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("mwc-list")!.style.height =
          `${this.clientHeight - (49 + 48)}px`;
      }, 300);
    }
  }

  private _addLabel() {
    showLabelDetailDialog(this, {
      createEntry: (values) => createLabelRegistryEntry(this.hass, values),
    });
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private async _labelSelected(ev: CustomEvent<SelectedDetail<Set<number>>>) {
    if (!ev.detail.index.size) {
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      this.value = [];
      return;
    }

    const value: string[] = [];

    for (const index of ev.detail.index) {
      const labelId = this._labels[index].label_id;
      value.push(labelId);
    }
    this.value = value;

    fireEvent(this, "data-table-filter-changed", {
      value,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          border-bottom: 1px solid var(--divider-color);
        }
        :host([expanded]) {
          flex: 1;
          height: 0;
        }
        ha-expansion-panel {
          --ha-card-border-radius: 0;
          --expansion-panel-content-padding: 0;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .badge {
          display: inline-block;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: 0;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: 50%;
          font-weight: 400;
          font-size: 11px;
          background-color: var(--accent-color);
          line-height: 16px;
          text-align: center;
          padding: 0px 2px;
          color: var(--text-accent-color, var(--text-primary-color));
        }
        .warning {
          color: var(--error-color);
        }
        ha-label {
          --ha-label-background-color: var(--color, var(--grey-color));
          --ha-label-background-opacity: 0.5;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-labels": HaFilterLabels;
  }
}
