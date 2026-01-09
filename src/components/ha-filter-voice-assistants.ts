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
import "./search-input-outlined";
import "./voice-assistant-brand-icon";
import { voiceAssistants } from "../data/expose";
import type { CloudStatus } from "../data/cloud";
import { fetchCloudStatus } from "../data/cloud";
import { isComponentLoaded } from "../common/config/is_component_loaded";

@customElement("ha-filter-voice-assistants")
export class HaFilterVoiceAssistants extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selectedVoiceAssistantIds: string[] =
    [];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _cloudStatus?: CloudStatus;

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
            "ui.panel.config.voice_assistants.assistants.caption"
          )}
          ${this.selectedVoiceAssistantIds?.length
            ? html`<div class="badge">
                  ${this.selectedVoiceAssistantIds?.length}
                </div>
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
                (assistantKey) => assistantKey,
                (assistantKey) =>
                  html`<ha-check-list-item
                    .value=${assistantKey}
                    .selected=${(this.selectedVoiceAssistantIds || []).includes(
                      assistantKey
                    )}
                    hasMeta
                    graphic="icon"
                  >
                    <voice-assistant-brand-icon
                      slot="graphic"
                      .voiceAssistantId=${assistantKey}
                      .hass=${this.hass}
                    >
                    </voice-assistant-brand-icon>
                    ${voiceAssistants[assistantKey].name}
                  </ha-check-list-item>`
              )}
            </ha-list> `
          : nothing}
      </ha-expansion-panel>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    // HA Assist is always one of the options
    this._voiceAssistantOptions = ["conversation"];

    // whether cloud based voice assistants are listed as options
    // depends on the current cloudStatus
    if (isComponentLoaded(this.hass, "cloud")) {
      this._handleCloudStatusUpdate();
    }
  }

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("ha-list")!.style.height =
          `${this.clientHeight - (49 + 48 + 32)}px`;
      }, 300);
    }
  }

  // translate the current CloudStatus to visible filter options
  private async _handleCloudStatusUpdate() {
    this._cloudStatus = await fetchCloudStatus(this.hass);

    if (
      // Relayer connecting
      this._cloudStatus.cloud === "connecting" ||
      // Remote connecting
      (this._cloudStatus.logged_in &&
        this._cloudStatus.prefs.remote_enabled &&
        !this._cloudStatus.remote_connected)
    ) {
      setTimeout(() => this._handleCloudStatusUpdate(), 5000);
    }

    if (this._cloudStatus.logged_in) {
      this._processCloudAssistantState(
        "cloud.alexa",
        this._cloudStatus.alexa_registered
      );
      this._processCloudAssistantState(
        "cloud.google_assistant",
        this._cloudStatus.google_registered
      );
    }
  }

  // translate the current registered state of a particular cloud-based voice assistant to
  // visible filter options, taking into account de-registration and re-registration
  // of these assistants
  private _processCloudAssistantState(
    voiceAssistantId: string,
    registered: boolean
  ) {
    if (registered) {
      // add to options (when not yet present)
      if (!this._voiceAssistantOptions.includes(voiceAssistantId))
        this._voiceAssistantOptions.push(voiceAssistantId);
    } else {
      // remove from options
      this._voiceAssistantOptions = this._voiceAssistantOptions.filter(
        (e) => e !== voiceAssistantId
      );
      // when this cloud assistent is de-registered while it is currently
      // selected, then unselect
      if (this.selectedVoiceAssistantIds.includes(voiceAssistantId)) {
        this.selectedVoiceAssistantIds = this.selectedVoiceAssistantIds.filter(
          (e) => e !== voiceAssistantId
        );
        fireEvent(this, "data-table-filter-changed", {
          value: this.selectedVoiceAssistantIds,
          items: undefined,
        });
      }
    }
  }

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  // TODO: review
  private async _assistantsSelected(
    ev: CustomEvent<SelectedDetail<Set<number>>>
  ) {
    if (!ev.detail.index) {
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      this.selectedVoiceAssistantIds = [];
      return;
    }

    const value: string[] = [];

    for (const index of ev.detail.index) {
      value.push(this._voiceAssistantOptions![index]);
    }

    this.selectedVoiceAssistantIds = value;

    fireEvent(this, "data-table-filter-changed", {
      value: this.selectedVoiceAssistantIds,
      items: undefined,
    });
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.selectedVoiceAssistantIds = [];
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
