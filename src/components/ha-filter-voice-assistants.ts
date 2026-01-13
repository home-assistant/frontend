import type { SelectedDetail } from "@material/mwc-list";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../common/dom/fire_event";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
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
  @property({ attribute: false }) public hass!: HomeAssistant;

  // the list of selected voiceAssistantIds
  @property({ attribute: false }) public value: string[] = [];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _voiceAssistantOptions: string[] = [];

  @state() private _shouldRender = false;

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
            "ui.panel.config.dashboard.voice_assistants.main"
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
                      .hass=${this.hass}
                    >
                    </voice-assistant-brand-icon>
                    ${voiceAssistants[voiceAssistantId].name}
                  </ha-check-list-item>`
              )}
            </ha-list> `
          : nothing}
      </ha-expansion-panel>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._voiceAssistantOptions = Object.keys(voiceAssistants);
  }

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("ha-list")!.style.height =
          `${this.clientHeight - 49}px`;
      }, 300);
    }
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
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
