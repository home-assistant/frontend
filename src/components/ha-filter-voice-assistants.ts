import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import { repeat } from "lit/directives/repeat";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import { arrayWith, arrayWithout } from "../common/array/array-with";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import type { ListFilterValue } from "../data/data_table_filters";
import {
  listFilterEventValue,
  listFilterValue,
} from "../data/data_table_filters";
import "./ha-expansion-panel";
import {
  filterBadgeStyles,
  NO_VALUE_ID,
  renderFilterBadge,
} from "./ha-filter-mode";
import "./ha-icon";
import "./ha-icon-button";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";
import "./voice-assistant-brand-icon";
import { voiceAssistants } from "../data/expose";

@customElement("ha-filter-voice-assistants")
export class HaFilterVoiceAssistants extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  // the list of selected voiceAssistantIds
  // A plain list of ids is still accepted
  @property({ attribute: false }) public value?: string[] | ListFilterValue;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _voiceAssistantOptions: string[] = [];

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.dashboard.voice_assistants.main")}
          ${
            this._count
              ? html`${renderFilterBadge(
                    this._localize,
                    this._count,
                    this._listValue?.exclude
                  )}
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    .label=${this._localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`<div class="content" ${ref(this._content)}>
              <ha-filter-mode
                .exclude=${this._listValue?.exclude ?? false}
                @filter-mode-changed=${this._modeChanged}
              ></ha-filter-mode>
              <ha-list-selectable
                multi
                aria-label=${this._localize(
                  "ui.panel.config.dashboard.voice_assistants.main"
                )}
                @ha-list-item-selected=${this._handleItemToggled}
                @ha-list-item-deselected=${this._handleItemToggled}
              >
                ${repeat(
                  this._voiceAssistantOptions,
                  (voiceAssistantId) => voiceAssistantId,
                  (voiceAssistantId) =>
                    html`<ha-list-item-option
                      appearance="checkbox"
                      selection-position="end"
                      .value=${voiceAssistantId}
                      .selected=${this._listValue?.ids?.includes(voiceAssistantId) ?? false}
                    >
                      <voice-assistant-brand-icon
                        slot="start"
                        .voiceAssistantId=${voiceAssistantId}
                      >
                      </voice-assistant-brand-icon>
                      <span slot="headline"
                        >${voiceAssistants[voiceAssistantId].name}</span
                      >
                    </ha-list-item-option>`
                )}
                <ha-list-item-option
                  appearance="checkbox"
                  selection-position="end"
                  .value=${NO_VALUE_ID}
                  .selected=${this._listValue?.none ?? false}
                >
                  <span slot="headline" class="no-value"
                    >${this._localize(
                      "ui.components.subpage-data-table.no_voice_assistant"
                    )}</span
                  >
                </ha-list-item-option>
              </ha-list-selectable>
            </div>`
          : nothing
      }
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._voiceAssistantOptions = Object.keys(voiceAssistants);
  }

  private get _listValue(): ListFilterValue | undefined {
    return listFilterValue(this.value);
  }

  private get _count(): number {
    const value = this._listValue;
    return (value?.ids?.length || 0) + (value?.none ? 1 : 0);
  }

  private _setValue(value: ListFilterValue) {
    this.value = value;
    fireEvent(this, "data-table-filter-changed", {
      value: listFilterEventValue(value),
      items: undefined,
    });
  }

  private _modeChanged(ev: CustomEvent<{ exclude: boolean }>) {
    this._setValue({ ...this._listValue, exclude: ev.detail.exclude });
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleItemToggled(
    ev: HASSDomEvent<number> & HASSDomCurrentTargetEvent<HaListSelectable>
  ) {
    const voiceAssistantId = (
      ev.currentTarget.items[ev.detail] as HaListItemOption | undefined
    )?.value;
    if (!voiceAssistantId) {
      return;
    }

    if (voiceAssistantId === NO_VALUE_ID) {
      this._setValue({
        ...this._listValue,
        none: ev.type === "ha-list-item-selected",
      });
      return;
    }

    const value = this._listValue ?? {};
    this._setValue({
      ...value,
      ids:
        ev.type === "ha-list-item-selected"
          ? arrayWith(value.ids, voiceAssistantId)
          : arrayWithout(value.ids, voiceAssistantId),
    });
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      filterPanelStyles,
      filterBadgeStyles,
      css`
        ha-list-selectable {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        ha-list-selectable::part(base) {
          flex: 1;
          min-height: 0;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .header ha-icon-button {
          margin-inline-start: auto;
          margin-inline-end: 8px;
        }
        .badge {
          display: inline-block;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        .add {
          position: absolute;
          bottom: 0;
          right: 0;
          left: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-voice-assistants": HaFilterVoiceAssistants;
  }
}
