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
import { toggleValue } from "../common/array/toggle-value";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-expansion-panel";
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
  @property({ attribute: false }) public value: string[] = [];

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
            this.value?.length
              ? html`<div class="badge">${this.value?.length}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`<div class="content" ${ref(this._content)}>
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
                      .selected=${this.value?.includes(voiceAssistantId) ?? false}
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

    this.value = toggleValue(
      this.value,
      voiceAssistantId,
      ev.type === "ha-list-item-selected"
    );

    fireEvent(this, "data-table-filter-changed", {
      value: this.value,
      items: undefined,
    });
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = [];
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      filterPanelStyles,
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
