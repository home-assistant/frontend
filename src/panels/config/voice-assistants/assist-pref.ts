import "@material/mwc-list/mwc-list";
import { mdiHelpCircle, mdiPlus, mdiStar } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatLanguageCode } from "../../../common/language/format_language";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import {
  AssistPipeline,
  createAssistPipeline,
  deleteAssistPipeline,
  listAssistPipelines,
  setAssistPipelinePreferred,
  updateAssistPipeline,
} from "../../../data/assist_pipeline";
import { CloudStatus } from "../../../data/cloud";
import { ExposeEntitySettings } from "../../../data/expose";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { showVoiceAssistantPipelineDetailDialog } from "./show-dialog-voice-assistant-pipeline-detail";
import { documentationUrl } from "../../../util/documentation-url";

export class AssistPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @state() private _pipelines: AssistPipeline[] = [];

  @state() private _preferred: string | null = null;

  @property() public cloudStatus?: CloudStatus;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    listAssistPipelines(this.hass).then((pipelines) => {
      this._pipelines = pipelines.pipelines;
      this._preferred = pipelines.preferred_pipeline;
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
                @click=${this._editPipeline}
                .id=${pipeline.id}
              >
                ${pipeline.name}
                <span slot="secondary">
                  ${formatLanguageCode(pipeline.language, this.hass.locale)}
                </span>
                ${this._preferred === pipeline.id
                  ? html`<ha-svg-icon
                      slot="meta"
                      .path=${mdiStar}
                    ></ha-svg-icon>`
                  : ""}
                <ha-icon-next slot="meta"></ha-icon-next>
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
        </div>
      </ha-card>
    `;
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
      preferred: pipeline?.id === this._preferred,
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
      setPipelinePreferred: async () => {
        await setAssistPipelinePreferred(this.hass!, pipeline!.id);
        this._preferred = pipeline!.id;
      },
      deletePipeline: async () => {
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
          return false;
        }

        await deleteAssistPipeline(this.hass!, pipeline!.id);
        this._pipelines = this._pipelines!.filter((res) => res !== pipeline);
        return true;
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
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      :host([dir="rtl"]) .header-actions {
        right: auto;
        left: 0;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-inline-end: 8px;
        margin-inline-start: 8px;
        margin-right: 8px;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
      ha-list-item {
        --mdc-list-item-meta-size: auto;
        --mdc-list-item-meta-display: flex;
      }
      ha-svg-icon,
      ha-icon-next {
        width: 24px;
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

customElements.define("assist-pref", AssistPref);
