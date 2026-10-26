import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-button";
import "../../../src/components/ha-card";
import type { ExtEntityRegistryEntry } from "../../../src/data/entity/entity_registry";
import "../../../src/dialogs/more-info/more-info-content";
import "../../../src/state-summary/state-card-content";
import type { HomeAssistant } from "../../../src/types";
import { computeShowNewMoreInfo } from "../../../src/dialogs/more-info/const";

@customElement("demo-more-info")
class DemoMoreInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ attribute: "show-config", type: Boolean })
  public showConfig = false;

  // Registry entry for controls that read entity options, like favorites.
  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry;

  // Local copy that follows saved changes. The parent passes the initial
  // entry again on each render, so `entry` itself cannot hold them.
  @state() private _entry?: ExtEntityRegistryEntry;

  @state() private _editMode = false;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("entry")) {
      this._entry = this.entry;
    }
  }

  private _toggleEditMode(ev: HASSDomEvent<HASSDomEvents["toggle-edit-mode"]>) {
    ev.stopPropagation();
    this._editMode = ev.detail;
  }

  private _entryUpdated(
    ev: HASSDomEvent<HASSDomEvents["entity-entry-updated"]>
  ) {
    ev.stopPropagation();
    this._entry = ev.detail;
  }

  private _editModeClicked() {
    this._editMode = !this._editMode;
  }

  render() {
    const stateObj = this._getState(this.entityId, this.hass.states);
    return html`
      <div class="root">
        <div id="card">
          <ha-card>
            ${
              !computeShowNewMoreInfo(stateObj)
                ? html`<state-card-content
                    .stateObj=${stateObj}
                    .hass=${this.hass}
                    in-dialog
                  ></state-card-content>`
                : nothing
            }

            <more-info-content
              .hass=${this.hass}
              .stateObj=${stateObj}
              .entry=${this._entry}
              .editMode=${this._editMode}
              @toggle-edit-mode=${this._toggleEditMode}
              @entity-entry-updated=${this._entryUpdated}
            ></more-info-content>
          </ha-card>
          ${
            this._entry
              ? html`<ha-button
                  class="edit-mode"
                  appearance="plain"
                  size="s"
                  @click=${this._editModeClicked}
                >
                  ${this._editMode ? "Exit edit mode" : "Edit favorites"}
                </ha-button>`
              : nothing
          }
        </div>
        ${this.showConfig ? html`<pre>${this._jsonEntity(stateObj)}</pre>` : ""}
      </div>
    `;
  }

  private _getState(entityId, states) {
    return states[entityId];
  }

  private _jsonEntity(stateObj) {
    // We are caching some things on stateObj
    // (it sucks, we will remove in the future)
    const tmp = {};
    Object.keys(stateObj).forEach((key) => {
      if (key[0] !== "_") {
        tmp[key] = stateObj[key];
      }
    });
    return JSON.stringify(tmp, null, 2);
  }

  static styles = css`
    .root {
      display: flex;
    }
    #card {
      max-width: 400px;
      width: 100vw;
    }
    ha-card {
      width: 352px;
      padding: 20px 24px;
    }
    .edit-mode {
      display: block;
      margin-top: var(--ha-space-2);
      text-align: center;
    }
    state-card-content {
      display: block;
      margin-bottom: 16px;
    }
    pre {
      width: 400px;
      margin: 0 16px;
      overflow: auto;
      color: var(--primary-text-color);
    }
    @media only screen and (max-width: 800px) {
      .root {
        flex-direction: column;
      }
      pre {
        margin: 16px 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info": DemoMoreInfo;
  }
}
