import "@material/mwc-list/mwc-list";
import {
  mdiBug,
  mdiCommentProcessingOutline,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiPlus,
  mdiStar,
  mdiTrashCan,
} from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatLanguageCode } from "../../../common/language/format_language";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import {
  AssistDevice,
  AssistPipeline,
  createAssistPipeline,
  deleteAssistPipeline,
  listAssistDevices,
  listAssistPipelines,
  setAssistPipelinePreferred,
  updateAssistPipeline,
} from "../../../data/assist_pipeline";
import { CloudStatus } from "../../../data/cloud";
import { ExposeEntitySettings } from "../../../data/expose";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import { showVoiceAssistantPipelineDetailDialog } from "./show-dialog-voice-assistant-pipeline-detail";
import { showVoiceCommandDialog } from "../../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import { stopPropagation } from "../../../common/dom/stop_propagation";

@customElement("assist-pref")
export class AssistPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @state() private _pipelines: AssistPipeline[] = [];

  @state() private _preferred: string | null = null;

  @state() private _devices: AssistDevice[] = [];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    listAssistPipelines(this.hass).then((pipelines) => {
      this._pipelines = pipelines.pipelines;
      this._preferred = pipelines.preferred_pipeline;
    });
    listAssistDevices(this.hass).then((devices) => {
      this._devices = devices;
    });
  }

  private _exposedEntitiesCount = memoizeOne(
    (exposedEntities: Record<string, ExposeEntitySettings>) =>
      Object.entries(exposedEntities).filter(
        ([entityId, expose]) =>
          expose.conversation && entityId in this.hass.states
      ).length
  );

  protected render() {
    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <img
            alt=""
            src=${brandsUrl({
              domain: "assist_pipeline",
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            })}
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
          />Assist
        </h1>
        <div class="header-actions">
          <a
            href=${documentationUrl(this.hass, "/docs/assist/")}
            target="_blank"
            rel="noreferrer noopener"
            class="icon-link"
          >
            <ha-icon-button
              label="Learn how it works"
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
        </div>
        <mwc-list>
          ${this._pipelines.map(
            (pipeline) => html`
              <ha-list-item
                twoline
                hasMeta
                role="button"
                .id=${pipeline.id}
                @click=${this._editPipeline}
              >
                <span>
                  ${pipeline.name}
                  ${this._preferred === pipeline.id
                    ? html`<ha-svg-icon .path=${mdiStar}></ha-svg-icon>`
                    : ""}
                </span>
                <span slot="secondary">
                  ${formatLanguageCode(pipeline.language, this.hass.locale)}
                </span>
                <ha-button-menu fixed slot="meta" @click=${stopPropagation}>
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.menu.open"
                    )}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>
                  <ha-list-item
                    graphic="icon"
                    .id=${pipeline.id}
                    @request-selected=${this._talkWithPipeline}
                  >
                    ${this.hass!.localize(
                      "ui.panel.config.voice_assistants.assistants.pipeline.start_conversation"
                    )}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiCommentProcessingOutline}
                    ></ha-svg-icon>
                  </ha-list-item>
                  <ha-list-item
                    graphic="icon"
                    .disabled=${this._preferred === pipeline.id}
                    .id=${pipeline.id}
                    @request-selected=${this._setPreferredPipeline}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.voice_assistants.assistants.pipeline.detail.set_as_preferred"
                    )}
                    <ha-svg-icon slot="graphic" .path=${mdiStar}></ha-svg-icon>
                  </ha-list-item>
                  <a href=${`/config/voice-assistants/debug/${pipeline.id}`}>
                    <ha-list-item graphic="icon">
                      ${this.hass.localize(
                        "ui.panel.config.voice_assistants.assistants.pipeline.detail.debug"
                      )}
                      <ha-svg-icon slot="graphic" .path=${mdiBug}></ha-svg-icon>
                    </ha-list-item>
                  </a>
                  <ha-list-item
                    class="danger"
                    graphic="icon"
                    .id=${pipeline.id}
                    @request-selected=${this._deletePipeline}
                  >
                    ${this.hass.localize("ui.common.delete")}
                    <ha-svg-icon
                      slot="graphic"
                      .path=${mdiTrashCan}
                    ></ha-svg-icon>
                  </ha-list-item>
                </ha-button-menu>
              </ha-list-item>
            `
          )}
        </mwc-list>
        <ha-button @click=${this._addPipeline} class="add" outlined>
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.assistants.pipeline.add_assistant"
          )}
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-button>
        <div class="card-actions">
          <a
            href="/config/voice-assistants/expose?assistants=conversation&historyBack"
          >
            <ha-button>
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.assistants.pipeline.exposed_entities",
                {
                  number: this.exposedEntities
                    ? this._exposedEntitiesCount(this.exposedEntities)
                    : 0,
                }
              )}
            </ha-button>
          </a>
          ${this._devices?.length
            ? html`
                <a href="/config/voice-assistants/assist/devices">
                  <ha-button>
                    ${this.hass.localize(
                      "ui.panel.config.voice_assistants.assistants.pipeline.assist_devices",
                      { number: this._devices.length }
                    )}
                  </ha-button>
                </a>
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _talkWithPipeline(ev) {
    const id = ev.currentTarget.id as string;
    showVoiceCommandDialog(this, this.hass, { pipeline_id: id });
  }

  private async _setPreferredPipeline(ev) {
    const id = ev.currentTarget.id as string;
    await setAssistPipelinePreferred(this.hass!, id);
    this._preferred = id;
  }

  private async _deletePipeline(ev) {
    const id = ev.currentTarget.id as string;
    if (this._preferred === id) {
      showAlertDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.delete.error_preferred"
        ),
      });
      return;
    }
    const pipeline = this._pipelines.find((res) => res.id === id);
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.delete.confirm_title",
          { name: pipeline!.name }
        ),
        text: this.hass!.localize(
          "ui.panel.config.voice_assistants.assistants.pipeline.delete.confirm_text",
          { name: pipeline!.name }
        ),
        confirmText: this.hass!.localize("ui.common.delete"),
        destructive: true,
      }))
    ) {
      return;
    }

    await deleteAssistPipeline(this.hass!, pipeline!.id);
    this._pipelines = this._pipelines!.filter((res) => res !== pipeline);
  }

  private _editPipeline(ev) {
    const id = ev.currentTarget.id as string;

    const pipeline = this._pipelines.find((res) => res.id === id);
    this._openDialog(pipeline);
  }

  private _addPipeline() {
    this._openDialog();
  }

  private async _openDialog(pipeline?: AssistPipeline): Promise<void> {
    showVoiceAssistantPipelineDetailDialog(this, {
      cloudActiveSubscription:
        this.cloudStatus?.logged_in && this.cloudStatus.active_subscription,
      pipeline,
      createPipeline: async (values) => {
        const created = await createAssistPipeline(this.hass!, values);
        this._pipelines = this._pipelines!.concat(created);
      },
      updatePipeline: async (values) => {
        const updated = await updateAssistPipeline(
          this.hass!,
          pipeline!.id,
          values
        );
        this._pipelines = this._pipelines!.map((res) =>
          res === pipeline ? updated : res
        );
      },
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        color: var(--primary-color);
      }
      .header-actions {
        position: absolute;
        right: 0px;
        inset-inline-end: 0px;
        inset-inline-start: initial;
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-right: 8px;
        margin-inline-end: 8px;
        margin-inline-start: initial;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
      ha-list-item {
        --mdc-list-item-meta-size: auto;
        --mdc-list-item-meta-display: flex;
        --mdc-list-side-padding-right: 8px;
      }

      ha-list-item.danger {
        color: var(--error-color);
        border-top: 1px solid var(--divider-color);
      }

      ha-button-menu a {
        text-decoration: none;
      }

      ha-svg-icon {
        color: currentColor;
        width: 16px;
      }

      .add {
        margin: 0 16px 16px;
      }
      .card-actions {
        display: flex;
      }
      .card-actions a {
        text-decoration: none;
      }
      .card-header {
        display: flex;
        align-items: center;
        padding-bottom: 0;
      }
      img {
        height: 28px;
        margin-right: 16px;
        margin-inline-end: 16px;
        margin-inline-start: initial;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pref": AssistPref;
  }
}
