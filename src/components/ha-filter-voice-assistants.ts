import type { SelectedDetail } from "@material/mwc-list";
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
import { fireEvent } from "../common/dom/fire_event";
import { haStyleScrollbar } from "../resources/styles";
import "./ha-check-list-item";
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-label";
import "./ha-list";
import "./ha-list-item";
import "./voice-assistant-brand-icon";
import { voiceAssistants } from "../data/expose";
import "../panels/config/voice-assistants/expose/expose-assistant-icon";

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
              <ha-list
                @selected=${this._assistantsSelected}
                class="ha-scrollbar"
                multi
              >
                ${repeat(
                  this._voiceAssistantOptions,
                  (voiceAssistantId) => voiceAssistantId,
                  (voiceAssistantId) =>
                    html`<ha-check-list-item
                      .value=${voiceAssistantId}
                      .selected=${(this.value || []).includes(voiceAssistantId)}
                      hasMeta
                      graphic="icon"
                    >
                      <voice-assistant-brand-icon
                        slot="graphic"
                        .voiceAssistantId=${voiceAssistantId}
                      >
                      </voice-assistant-brand-icon>
                      ${voiceAssistants[voiceAssistantId].name}
                    </ha-check-list-item>`
                )}
              </ha-list>
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

  private async _assistantsSelected(
    ev: CustomEvent<SelectedDetail<Set<number>>>
  ) {
    if (!ev.detail.index) {
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      this.value = [];
      return;
    }

    const newvalue: string[] = [];
    for (const index of ev.detail.index) {
      newvalue.push(this._voiceAssistantOptions![index]);
    }
    this.value = newvalue;

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
      haStyleScrollbar,
      filterPanelStyles,
      css`
        ha-list {
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
        ha-check-list-item {
          --mdc-list-item-graphic-margin: var(--ha-space-4);
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
