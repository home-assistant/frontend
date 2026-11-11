import { mdiAlert, mdiAlertCircle } from "@mdi/js";
import type { ContextType } from "@lit/context";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { STATE_RUNNING } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../common/decorators/consume";
import { navigate } from "../../common/navigate";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-base";
import "../../components/list/ha-list-base";
import "../../components/progress/ha-progress-bar";
import type {
  BootstrapProgress,
  StartupProgressView,
} from "../../data/bootstrap_integrations";
import {
  computeStartupProgress,
  subscribeBootstrapProgress,
} from "../../data/bootstrap_integrations";
import {
  apiContext,
  configContext,
  connectionContext,
  internationalizationContext,
} from "../../data/context";
import type { IntegrationSetup } from "../../data/integration";
import { domainToName, fetchIntegrationSetups } from "../../data/integration";
import { haStyleDialog } from "../../resources/styles";
import { DialogMixin } from "../dialog-mixin";

const MAX_SLOWEST = 10;

@customElement("dialog-startup-progress")
class DialogStartupProgress extends DialogMixin(LitElement) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @state() private _progress?: BootstrapProgress;

  @state() private _setups?: IntegrationSetup[];

  @state() private _legacy = false;

  private _unsubProgress?: Promise<UnsubscribeFunc>;

  private _computeProgress = memoizeOne(computeStartupProgress);

  connectedCallback() {
    super.connectedCallback();
    // Core sends the last progress on subscribe, older cores do not.
    this._unsubProgress = subscribeBootstrapProgress(
      this._connection.connection,
      (progress) => {
        this._progress = progress;
      },
      () => {
        this._legacy = true;
      }
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubProgress?.then((unsub) => unsub());
    this._unsubProgress = undefined;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      !this._setups &&
      changedProps.has("_config") &&
      this._config.config.state === STATE_RUNNING
    ) {
      this._setups = [];
      fetchIntegrationSetups(this._api.callWS).then((setups) => {
        this._setups = setups
          .filter((setup) => setup.seconds !== undefined)
          .sort((a, b) => b.seconds! - a.seconds!)
          .slice(0, MAX_SLOWEST);
      });
    }
  }

  protected render() {
    const localize = this._i18n.localize;
    const progress =
      this._progress ||
      (this._legacy && this._config.config.state === STATE_RUNNING)
        ? this._computeProgress(this._progress, this._config.config.state)
        : undefined;
    const issues = progress
      ? progress.failed.length + progress.retrying.length
      : 0;
    return html`
      <ha-dialog open header-title=${localize("ui.startup_progress.details")}>
        ${
          !progress
            ? html`<ha-spinner></ha-spinner>`
            : progress.finished
              ? this._renderSummary(progress.elapsed, issues)
              : this._renderLive(progress)
        }
        ${
          progress
            ? html`
                ${this._renderDomains("failed", progress.failed, mdiAlertCircle)}
                ${this._renderDomains("retrying", progress.retrying, mdiAlert)}
              `
            : nothing
        }
        ${progress?.finished ? this._renderSlowest() : nothing}
        <ha-dialog-footer slot="footer">
          ${
            issues && this._config.user?.is_admin
              ? html`<ha-button
                  slot="secondaryAction"
                  appearance="plain"
                  @click=${this._openIntegrations}
                >
                  ${localize("ui.startup_progress.open_integrations")}
                </ha-button>`
              : nothing
          }
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderLive(progress: StartupProgressView) {
    const localize = this._i18n.localize;
    const phase = localize(`ui.startup_progress.phase.${progress.phase}`);
    return html`
      <div class="status">
        <span class="phase">${phase}</span>
        <span class="secondary">
          ${
            progress.total === null
              ? localize("ui.startup_progress.integrations_unknown")
              : localize("ui.startup_progress.integrations", {
                  done: progress.done,
                  total: progress.total,
                })
          }
          ${
            progress.elapsed
              ? html` ·
                ${localize("ui.startup_progress.elapsed", {
                  seconds: Math.round(progress.elapsed),
                })}`
              : nothing
          }
        </span>
        <ha-progress-bar
          .value=${progress.percent ?? 0}
          .indeterminate=${progress.percent === undefined}
          .label=${phase}
        ></ha-progress-bar>
      </div>
      ${
        progress.active.length
          ? html`
              <h3>${localize("ui.startup_progress.active")}</h3>
              <ha-list-base>
                ${progress.active.map(([domain, seconds]) =>
                  this._row(domain, seconds)
                )}
              </ha-list-base>
            `
          : nothing
      }
    `;
  }

  private _renderSummary(elapsed: number | undefined, issues: number) {
    const localize = this._i18n.localize;
    const seconds = Math.round(elapsed ?? 0);
    return html`
      <ha-alert .alertType=${issues ? "warning" : "success"}>
        ${
          !elapsed
            ? localize(`ui.startup_progress.phase.running`)
            : issues
              ? localize("ui.startup_progress.started_with_issues", {
                  seconds,
                  count: issues,
                })
              : localize("ui.startup_progress.started", { seconds })
        }
      </ha-alert>
    `;
  }

  private _renderSlowest() {
    if (!this._setups?.length) {
      return nothing;
    }
    return html`
      <h3>${this._i18n.localize("ui.startup_progress.slowest")}</h3>
      <ha-list-base>
        ${this._setups.map((setup) => this._row(setup.domain, setup.seconds!))}
      </ha-list-base>
    `;
  }

  private _renderDomains(
    key: "failed" | "retrying",
    domains: string[],
    icon: string
  ) {
    if (!domains.length) {
      return nothing;
    }
    return html`
      <h3>${this._i18n.localize(`ui.startup_progress.${key}`)}</h3>
      <ha-list-base>
        ${domains.map(
          (domain) => html`
            <ha-list-item-base>
              <ha-svg-icon
                slot="start"
                class=${key}
                .path=${icon}
              ></ha-svg-icon>
              <span slot="headline">
                ${domainToName(this._i18n.localize, domain)}
              </span>
            </ha-list-item-base>
          `
        )}
      </ha-list-base>
    `;
  }

  private _row(domain: string, seconds: number) {
    return html`
      <ha-list-item-base>
        <span slot="headline">
          ${domainToName(this._i18n.localize, domain)}
        </span>
        <span slot="end" class="secondary">
          ${this._i18n.localize("ui.startup_progress.seconds", {
            seconds: seconds.toFixed(1),
          })}
        </span>
      </ha-list-item-base>
    `;
  }

  private _openIntegrations() {
    navigate("/config/integrations/dashboard");
    this.closeDialog();
  }

  static styles = [
    haStyleDialog,
    css`
      ha-spinner {
        display: block;
        margin: var(--ha-space-6) auto;
      }
      .status {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1);
      }
      .phase {
        font-weight: var(--ha-font-weight-medium);
      }
      .secondary {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      ha-progress-bar {
        margin-top: var(--ha-space-1);
      }
      h3 {
        margin: var(--ha-space-4) 0 0;
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
      }
      ha-svg-icon {
        flex-shrink: 0;
      }
      ha-svg-icon.failed {
        color: var(--error-color);
      }
      ha-svg-icon.retrying {
        color: var(--warning-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-startup-progress": DialogStartupProgress;
  }
}
