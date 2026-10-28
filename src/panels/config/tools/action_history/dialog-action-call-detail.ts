import type { ContextType } from "@lit/context";
import { mdiContentCopy } from "@mdi/js";
import { dump } from "js-yaml";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import { consume } from "../../../../common/decorators/consume";
import { navigate } from "../../../../common/navigate";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../../components/buttons/ha-progress-button";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-yaml-editor";
import {
  apiContext,
  configContext,
  internationalizationContext,
  servicesContext,
} from "../../../../data/context";
import type { LogbookActionCall } from "../../../../data/logbook";
import { localizeTriggerSource } from "../../../../data/logbook";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import { showToast } from "../../../../util/toast";
import type { LogbookCause } from "../../../logbook/logbook-entry-model";
import { renderLogbookCauseIcon } from "../../../logbook/logbook-entry-templates";
import type { HomeAssistant } from "../../../../types";
import type { ActionCallDetailDialogParams } from "./show-dialog-action-call-detail";

const TARGET_KEYS = new Set([
  "entity_id",
  "device_id",
  "area_id",
  "floor_id",
  "label_id",
]);

// The call as an action, like it would be written in an automation.
const callToAction = (
  call: LogbookActionCall,
  services: HomeAssistant["services"] | undefined
) => {
  const service = services?.[call.domain]?.[call.service];
  const action: Record<string, unknown> = {
    action: `${call.domain}.${call.service}`,
  };
  const target: Record<string, unknown> = {};
  const data: Record<string, unknown> = {};
  // Only actions that accept a target get one, for others (like scripts)
  // these keys are regular fields.
  const hasTarget = service !== undefined && "target" in service;
  for (const [key, value] of Object.entries(call.service_data)) {
    if (hasTarget && TARGET_KEYS.has(key)) {
      target[key] = value;
    } else {
      data[key] = value;
    }
  }
  if (Object.keys(target).length) {
    action.target = target;
  }
  if (Object.keys(data).length) {
    action.data = data;
  }
  if (service !== undefined && "response" in service) {
    action.response_variable = "action_response";
  }
  return action;
};

@customElement("dialog-action-call-detail")
export class DialogActionCallDetail extends DialogMixin<ActionCallDetailDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: servicesContext, subscribe: true })
  private _services!: ContextType<typeof servicesContext>;

  protected render() {
    if (!this.params || !this._i18n || !this._config) {
      return nothing;
    }
    const { call, name, cause, user, traceUrl } = this.params;
    const localize = this._i18n.localize;
    const canPerform = Boolean(this._services?.[call.domain]?.[call.service]);

    return html`
      <ha-dialog
        open
        width="medium"
        .headerTitle=${name}
        .headerSubtitle=${`${call.domain}.${call.service}`}
      >
        <ha-icon-button
          slot="headerActionItems"
          .label=${localize(
            "ui.panel.config.tools.tabs.action_history.copy_yaml"
          )}
          .path=${mdiContentCopy}
          @click=${this._copyYaml}
        ></ha-icon-button>
        <dl>
          <dt>${localize("ui.panel.config.tools.tabs.action_history.time")}</dt>
          <dd>
            ${formatDateTimeWithSeconds(
              new Date(call.when * 1000),
              this._i18n.locale,
              this._config.config
            )}
          </dd>
          ${
            cause
              ? html`
                  <dt>
                    ${localize("ui.panel.config.tools.tabs.action_history.cause")}
                  </dt>
                  <dd>
                    ${this._renderCause(
                      cause,
                      localizeTriggerSource(
                        localize,
                        call.context_source ?? null
                      )
                    )}
                  </dd>
                `
              : nothing
          }
          ${
            user
              ? html`
                  <dt>
                    ${localize("ui.panel.config.tools.tabs.action_history.user")}
                  </dt>
                  <dd>${this._renderCause(user)}</dd>
                `
              : nothing
          }
          <dt>
            ${localize("ui.panel.config.tools.tabs.action_history.context_id")}
          </dt>
          <dd class="code">${call.context_id}</dd>
        </dl>
        <ha-yaml-editor
          .label=${localize("ui.panel.config.tools.tabs.action_history.data")}
          .defaultValue=${call.service_data}
          read-only
          in-dialog
        ></ha-yaml-editor>
        ${
          traceUrl || canPerform
            ? html`
                <ha-dialog-footer slot="footer">
                  ${
                    traceUrl
                      ? html`
                          <ha-button
                            slot="secondaryAction"
                            appearance="plain"
                            @click=${this._viewTrace}
                          >
                            ${localize("ui.components.logbook.view_trace")}
                          </ha-button>
                        `
                      : nothing
                  }
                  ${
                    canPerform
                      ? html`
                          <ha-progress-button
                            slot="primaryAction"
                            @click=${this._performAgain}
                          >
                            ${localize(
                              "ui.panel.config.tools.tabs.action_history.perform_again"
                            )}
                          </ha-progress-button>
                        `
                      : nothing
                  }
                </ha-dialog-footer>
              `
            : nothing
        }
      </ha-dialog>
    `;
  }

  private _renderCause(cause: LogbookCause, detail?: string) {
    return html`
      <div class="cause">
        ${renderLogbookCauseIcon(cause)}
        <div>
          <div>${cause.name}</div>
          ${detail ? html`<div class="secondary">${detail}</div>` : nothing}
        </div>
      </div>
    `;
  }

  private async _copyYaml() {
    await copyToClipboard(
      dump(callToAction(this.params!.call, this._services))
    );
    showToast(this, {
      message: this._i18n.localize("ui.common.copied_clipboard"),
    });
  }

  private async _performAgain(ev: Event) {
    const button = ev.currentTarget as HaProgressButton;
    const { domain, service, service_data } = this.params!.call;
    button.progress = true;
    try {
      // Calls with a response fail when it is not asked for.
      await this._api.callService(
        domain,
        service,
        service_data,
        undefined,
        true,
        "response" in this._services[domain][service]
      );
    } catch {
      button.actionError();
      return;
    } finally {
      button.progress = false;
    }
    button.actionSuccess();
  }

  private _viewTrace() {
    navigate(this.params!.traceUrl!);
    this.closeDialog();
  }

  static styles = css`
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: var(--ha-space-2) var(--ha-space-4);
      margin: 0 0 var(--ha-space-4);
    }

    dt {
      color: var(--secondary-text-color);
    }

    dd {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .code {
      font-family: var(--ha-font-family-code);
    }

    .cause {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }

    .cause-icon {
      flex-shrink: 0;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
    }

    .cause-avatar {
      width: 20px;
      height: 20px;
      font-size: 9px;
    }

    .secondary {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-action-call-detail": DialogActionCallDetail;
  }
}
