import {
  mdiCalendarClock,
  mdiDelete,
  mdiPencil,
  mdiPlus,
  mdiSync,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mainWindow } from "../../../../../common/dom/get_main_window";
import { computeStateName } from "../../../../../common/entity/compute_state_name";
import { createMoreInfoUrl } from "../../../../../common/url/more-info-query-params";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-relative-time";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/item/ha-list-item-base";
import "../../../../../components/list/ha-list-base";
import type {
  ZHAWeeklyScheduleLink,
  ZHAWeeklySchedules,
} from "../../../../../data/zha";
import {
  removeZHAWeeklySchedule,
  subscribeZHAWeeklySchedules,
  syncZHAWeeklySchedule,
} from "../../../../../data/zha";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../../../types";
import { showZHAAddWeeklyScheduleDialog } from "./show-dialog-zha-add-weekly-schedule";

const PREFIX = "ui.panel.config.zha.weekly_schedules";

@customElement("zha-weekly-schedules-card")
class ZHAWeeklySchedulesCard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _data?: ZHAWeeklySchedules;

  @state() private _removing = new Set<string>();

  protected hassSubscribe(): Promise<UnsubscribeFunc>[] {
    return [
      // Hidden on Core versions without weekly schedule support.
      subscribeZHAWeeklySchedules(this.hass, (data) => {
        this._data = data;
      }).catch(() => () => undefined),
    ];
  }

  protected render(): TemplateResult | typeof nothing {
    if (
      !this._data ||
      (!this._data.links.length && !this._data.thermostats.length)
    ) {
      return nothing;
    }
    const unlinked = this._unlinkedThermostats();

    return html`
      <ha-card class="nav-card">
        <div class="card-header">
          ${this.hass.localize(`${PREFIX}.title`)}
          <ha-button
            appearance="filled"
            .disabled=${!unlinked.length}
            @click=${this._addLink}
          >
            <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize(`${PREFIX}.add`)}
          </ha-button>
        </div>
        <div class="card-content">
          <p class="description">
            ${this.hass.localize(`${PREFIX}.description`)}
          </p>
          <p class="auto-override-note">
            ${this.hass.localize(`${PREFIX}.auto_override_note`)}
          </p>
          ${
            this._data.links.length
              ? html`<ha-list-base
                  .ariaLabel=${this.hass.localize(`${PREFIX}.title`)}
                >
                  ${this._data.links.map((link) => this._renderLink(link))}
                </ha-list-base>`
              : html`<p class="empty">
                  ${this.hass.localize(`${PREFIX}.no_links`)}
                </p>`
          }
        </div>
      </ha-card>
    `;
  }

  private _renderLink(link: ZHAWeeklyScheduleLink) {
    const removing = this._removing.has(link.link_id);
    return html`
      <ha-list-item-base wrap-headline wrap-supporting-text>
        <ha-svg-icon slot="start" .path=${mdiCalendarClock}></ha-svg-icon>
        <span slot="headline">
          ${this._entityName(link.thermostat_entity_id)} ←
          ${this._entityName(link.schedule_entity_id)}
        </span>
        <span slot="supporting-text">
          ${
            removing
              ? html`<span class="removing">
                  <ha-spinner size="tiny"></ha-spinner>
                  ${this.hass.localize(`${PREFIX}.removing`)}
                </span>`
              : html`<span class=${link.state}
                    >${this._renderStatus(link)}</span
                  >
                  ${this._renderAutoHint(link)}`
          }
        </span>
        <ha-icon-button
          slot="end"
          .label=${this.hass.localize(`${PREFIX}.edit`)}
          .path=${mdiPencil}
          .disabled=${removing}
          .link=${link}
          @click=${this._editLink}
        ></ha-icon-button>
        <ha-icon-button
          slot="end"
          .label=${this.hass.localize(`${PREFIX}.sync_now`)}
          .path=${mdiSync}
          .disabled=${removing || link.state === "syncing"}
          .linkId=${link.link_id}
          @click=${this._syncLink}
        ></ha-icon-button>
        <ha-icon-button
          slot="end"
          .label=${this.hass.localize(`${PREFIX}.remove`)}
          .path=${mdiDelete}
          .disabled=${removing}
          .linkId=${link.link_id}
          @click=${this._removeLink}
        ></ha-icon-button>
      </ha-list-item-base>
    `;
  }

  private _renderStatus(link: ZHAWeeklyScheduleLink) {
    const status = this.hass.localize(`${PREFIX}.state.${link.state}`);
    if (link.state === "error") {
      return html`${status}: ${link.last_error}`;
    }
    if (link.last_synced_at) {
      return html`${status} ·
        <ha-relative-time
          .hass=${this.hass}
          .datetime=${link.last_synced_at}
        ></ha-relative-time>`;
    }
    return status;
  }

  private _renderAutoHint(link: ZHAWeeklyScheduleLink) {
    const entityId = link.thermostat_entity_id;
    const thermostat = entityId ? this.hass.states[entityId] : undefined;
    if (
      !entityId ||
      !thermostat ||
      thermostat.state === "auto" ||
      thermostat.state === "unknown" ||
      thermostat.state === "unavailable" ||
      !thermostat.attributes.hvac_modes?.includes("auto")
    ) {
      return nothing;
    }

    return html`
      <span class="mode-warning">
        ${this.hass.localize(`${PREFIX}.auto_disabled`)}
        <a
          href=${createMoreInfoUrl(mainWindow.location.href, {
            entityId,
            view: "info",
          })}
        >
          ${this.hass.localize(`${PREFIX}.open_thermostat`)}
        </a>
      </span>
    `;
  }

  private _entityName(entityId: string | null): string {
    if (!entityId) {
      return this.hass.localize(`${PREFIX}.missing_entity`);
    }
    const stateObj = this.hass.states[entityId];
    return stateObj ? computeStateName(stateObj) : entityId;
  }

  private _unlinkedThermostats(): string[] {
    const linked = new Set(
      this._data!.links.map((link) => link.thermostat_entity_id)
    );
    return this._availableThermostats().filter(
      (entityId) => !linked.has(entityId)
    );
  }

  private _availableThermostats(): string[] {
    return this._data!.thermostats.map((item) => item.entity_id).filter(
      (entityId) => {
        const thermostat = this.hass.states[entityId];
        return (
          thermostat &&
          thermostat.state !== "unavailable" &&
          thermostat.state !== "unknown"
        );
      }
    );
  }

  private _addLink(): void {
    showZHAAddWeeklyScheduleDialog(this, {
      thermostats: this._unlinkedThermostats(),
    });
  }

  private _editLink(ev: Event): void {
    showZHAAddWeeklyScheduleDialog(this, {
      thermostats: [],
      link: (ev.currentTarget as any).link as ZHAWeeklyScheduleLink,
    });
  }

  private async _syncLink(ev: Event): Promise<void> {
    const linkId = (ev.currentTarget as any).linkId as string;
    try {
      await syncZHAWeeklySchedule(this.hass, linkId);
    } catch (err: any) {
      showAlertDialog(this, { text: err.message, warning: true });
    }
  }

  private async _removeLink(ev: Event): Promise<void> {
    const linkId = (ev.currentTarget as any).linkId as string;
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(`${PREFIX}.remove_title`),
      text: this.hass.localize(`${PREFIX}.remove_text`),
      confirmText: this.hass.localize(`${PREFIX}.remove`),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    this._removing = new Set(this._removing).add(linkId);
    try {
      await removeZHAWeeklySchedule(this.hass, linkId);
    } catch (err: any) {
      if (err.code === "weekly_schedule_clear_failed") {
        const unlink = await showConfirmationDialog(this, {
          title: this.hass.localize(`${PREFIX}.remove_without_clearing_title`),
          text: this.hass.localize(`${PREFIX}.remove_without_clearing_text`, {
            error: err.message,
          }),
          confirmText: this.hass.localize(`${PREFIX}.remove_without_clearing`),
          destructive: true,
        });
        if (unlink) {
          try {
            await removeZHAWeeklySchedule(this.hass, linkId, true);
          } catch (unlinkErr: any) {
            showAlertDialog(this, { text: unlinkErr.message, warning: true });
          }
        }
      } else {
        showAlertDialog(this, { text: err.message, warning: true });
      }
    } finally {
      const removing = new Set(this._removing);
      removing.delete(linkId);
      this._removing = removing;
    }
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: var(--ha-content-width-narrow, 600px);
      margin: var(--ha-space-4) auto 0;
      box-sizing: border-box;
    }
    ha-card {
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
      padding-bottom: var(--ha-space-2);
    }
    .card-content {
      padding: 0;
    }
    .description,
    .auto-override-note,
    .empty {
      margin: 0;
      padding: 0 var(--ha-space-4) var(--ha-space-4);
      color: var(--secondary-text-color);
    }
    .description {
      padding-top: var(--ha-space-2);
    }
    .error {
      color: var(--error-color);
    }
    .removing {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    .mode-warning {
      display: block;
      color: var(--warning-color);
    }
    .mode-warning a {
      color: var(--primary-color);
    }
    @media (max-width: 600px) {
      ha-list-item-base::part(base) {
        flex-wrap: wrap;
      }
      ha-list-item-base::part(start) {
        display: none;
      }
      ha-list-item-base::part(content) {
        flex-basis: 100%;
      }
      ha-list-item-base::part(end) {
        margin-inline-start: auto;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-weekly-schedules-card": ZHAWeeklySchedulesCard;
  }
}
