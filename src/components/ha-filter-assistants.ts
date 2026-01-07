import type { SelectedDetail } from "@material/mwc-list";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-label";
import "./ha-list";
import "./ha-list-item";
import "./search-input-outlined";
import "../panels/config/voice-assistants/expose/expose-assistant-icon";
import { voiceAssistants } from "../data/expose";

@customElement("ha-filter-assistants")
export class HaFilterAssistants extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  // TODO
  // @state() private _labels: LabelRegistryEntry[] = [];
  @state() private _assistantKeys: string[] = [];

  @state() private _shouldRender = false;

  @state() private _filter?: string;

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      // TODO
      // subscribeLabelRegistry(this.hass.connection, (labels) => {
      //   this._labels = labels;
      // }),
    ];
  }

  // TODO
  private _filteredAssistantKeys = memoizeOne(
    // `_value` used to recalculate the memoization when the selection changes
    (assistantKeys: string[], filter: string | undefined, _value) =>
      assistantKeys
        .filter(
          (assistantKey) =>
            !filter ||
            // label.name.toLowerCase().includes(filter) ||
            // label.label_id.toLowerCase().includes(filter)
            assistantKey === filter
        )
        .sort((a, b) =>
          stringCompare(
            // a.name || a.label_id,
            // b.name || b.label_id,
            a,
            b // ,
            // this.hass.locale.language
          )
        )
  );

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.assistants.caption"
          )}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>
                <ha-icon-button
                  .path=${mdiFilterVariantRemove}
                  @click=${this._clearFilter}
                ></ha-icon-button>`
            : nothing}
        </div>
        ${this._shouldRender
          ? html`<ha-list
              @selected=${this._assistantsSelected}
              class="ha-scrollbar"
              multi
            >
              ${repeat(
                // TODO
                // this._filteredAssistantKeys(
                //   this._assistantKeys,
                //   this._filter,
                //   this.value
                // ),
                Object.keys(voiceAssistants),
                (assistantKey) => assistantKey,
                (assistantKey) =>
                  html`<ha-check-list-item
                    .value=${assistantKey}
                    .selected=${(this.value || []).includes(assistantKey)}
                    hasMeta
                  >
                    <voice-assistants-expose-assistant-icon
                      .assistant=${assistantKey}
                      .hass=${this.hass}
                    >
                    </voice-assistants-expose-assistant-icon>
                    ${voiceAssistants[assistantKey].label}
                  </ha-check-list-item>`
              )}
            </ha-list> `
          : nothing}
      </ha-expansion-panel>
    `;
  }

  protected updated(changed) {
    // eslint-disable-next-line no-console
    console.log(changed);

    // if (changed.has("expanded") && this.expanded) {
    //   setTimeout(() => {
    //     if (!this.expanded) return;
    //     this.renderRoot.querySelector("ha-list")!.style.height =
    //       `${this.clientHeight - (49 + 48 + 32)}px`;
    //   }, 300);
    // }
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  // TODO
  private async _assistantsSelected(
    ev: CustomEvent<SelectedDetail<Set<number>>>
  ) {
    const filteredAssistantKeys = this._filteredAssistantKeys(
      this._assistantKeys,
      this._filter,
      this.value
    );

    // const filteredLabelIds = new Set(filteredAssistants.map((l) => l.label_id));

    // Keep previously selected assistants that are not in the current filtered view
    const preservedAssistantKeys = (this.value || []).filter(
      (id) => !(id in filteredAssistantKeys)
    );

    // Build the new selection from the filtered assistants based on selected indices
    const newlySelectedAssistants: string[] = [];
    for (const index of ev.detail.index) {
      const assistentKey = filteredAssistantKeys[index];
      if (assistentKey) {
        newlySelectedAssistants.push(assistentKey);
      }
    }

    const value = [...preservedAssistantKeys, ...newlySelectedAssistants];
    this.value = value.length ? value : [];

    fireEvent(this, "data-table-filter-changed", {
      value: value.length ? value : undefined,
      items: undefined,
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
      haStyleScrollbar,
      css`
        :host {
          position: relative;
          border-bottom: 1px solid var(--divider-color);
        }
        :host([expanded]) {
          flex: 1;
          height: 0;
        }
        ha-expansion-panel {
          --ha-card-border-radius: var(--ha-border-radius-square);
          --expansion-panel-content-padding: 0;
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
          margin-inline-end: 0;
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
        .warning {
          color: var(--error-color);
        }
        ha-label {
          --ha-label-background-color: var(--color, var(--grey-color));
          --ha-label-background-opacity: 0.5;
        }
        .add {
          position: absolute;
          bottom: 0;
          right: 0;
          left: 0;
        }
        search-input-outlined {
          display: block;
          padding: var(--ha-space-1) var(--ha-space-2) 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-assistants": HaFilterAssistants;
  }
}
