import type { ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { consume } from "../../../common/decorators/consume";
import { formatDate } from "../../../common/datetime/format_date";
import { relativeTime } from "../../../common/datetime/relative_time";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon";
import "../../../components/ha-label";
import "../../../components/ha-spinner";
import "../../../components/item/ha-list-item-base";
import "../../../components/list/ha-list-base";
import {
  apiContext,
  areasContext,
  brandsAccessTokenContext,
  configContext,
  connectionContext,
  internationalizationContext,
  labelsContext,
  manifestsContext,
  uiContext,
} from "../../../data/context";
import type { DeletedDeviceRegistryEntry } from "../../../data/device/device_registry";
import {
  fetchDeletedDeviceRegistryEntries,
  forgetDeletedDeviceRegistryEntry,
} from "../../../data/device/device_registry";
import type { DeletedEntityRegistryEntry } from "../../../data/entity/entity_registry";
import {
  fetchDeletedEntityRegistryEntries,
  forgetDeletedEntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import { domainToName } from "../../../data/integration";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../resources/styles";
import { brandsUrl } from "../../../util/brands-url";
import type { RecentlyRemovedDialogParams } from "./show-dialog-recently-removed";

// Matches ORPHANED_DEVICE_KEEP_SECONDS / ORPHANED_ENTITY_KEEP_SECONDS in core.
const ORPHANED_KEEP_SECONDS = 30 * 86400;

const MAX_IDENTIFIER_LENGTH = 24;

interface RemovedItem {
  id: string;
  headline: string;
  unnamed: boolean;
  details: string[];
  domain: string | null;
  areaId: string | null;
  labels: string[];
  removedAt: number;
  orphanedAt: number | null;
}

const shortIdentifier = (device: DeletedDeviceRegistryEntry) => {
  const value = device.identifiers[0]?.[1] ?? device.connections[0]?.[1];
  if (!value) {
    return undefined;
  }
  return value.length > MAX_IDENTIFIER_LENGTH
    ? `${value.slice(0, MAX_IDENTIFIER_LENGTH - 1)}…`
    : value;
};

@customElement("dialog-recently-removed")
class DialogRecentlyRemoved extends DialogMixin<RecentlyRemovedDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  private _ui!: ContextType<typeof uiContext>;

  @state()
  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labels?: ContextType<typeof labelsContext>;

  @state()
  @consume({ context: manifestsContext, subscribe: true })
  private _manifests?: ContextType<typeof manifestsContext>;

  @state()
  @consume({ context: brandsAccessTokenContext, subscribe: true })
  // @ts-ignore re-render trigger only, its value is never read
  private _brandsAccessToken?: string;

  @state() private _devices?: DeletedDeviceRegistryEntry[];

  @state() private _entities?: DeletedEntityRegistryEntry[];

  @state() private _error?: string;

  @state() private _forgetError?: string;

  connectedCallback() {
    super.connectedCallback();
    this._load();
  }

  private get _isDevice() {
    return this.params!.type === "device";
  }

  private async _load(): Promise<void> {
    try {
      if (this._isDevice) {
        this._devices = await fetchDeletedDeviceRegistryEntries(
          this._api.callWS
        );
      } else {
        this._entities = await fetchDeletedEntityRegistryEntries(
          this._api.callWS
        );
      }
    } catch (err: any) {
      this._error =
        err?.message ||
        this._i18n.localize("ui.panel.config.recently_removed.load_failed");
      return;
    }
    const domains = new Set(
      (this._devices ?? []).map((device) => device.domain).filter(Boolean)
    );
    this._entities?.forEach((entity) => domains.add(entity.platform));
    if (domains.size) {
      await this._i18n.loadBackendTranslation("title", [
        ...domains,
      ] as string[]);
      this.requestUpdate();
    }
  }

  private _integrationName(domain: string) {
    return domainToName(this._i18n.localize, domain, this._manifests?.[domain]);
  }

  private _items(): RemovedItem[] | undefined {
    const key = "ui.panel.config.recently_removed";
    const items = this._isDevice
      ? this._devices?.map((device): RemovedItem => {
          const identifier = shortIdentifier(device);
          const fallback = [
            device.domain
              ? this._integrationName(device.domain)
              : this._i18n.localize(`${key}.unnamed_device`),
            identifier,
          ]
            .filter(Boolean)
            .join(" · ");
          return {
            id: device.id,
            headline: device.name_by_user ?? fallback,
            unnamed: !device.name_by_user,
            details: [],
            domain: device.domain,
            areaId: device.area_id,
            labels: device.labels,
            removedAt: device.modified_at,
            orphanedAt: device.orphaned_timestamp,
          };
        })
      : this._entities?.map((entity): RemovedItem => ({
          id: entity.id,
          headline: entity.name ?? entity.entity_id,
          unnamed: false,
          details: entity.name ? [entity.entity_id] : [],
          domain: entity.platform,
          areaId: entity.area_id,
          labels: entity.labels,
          removedAt: entity.modified_at,
          orphanedAt: entity.orphaned_timestamp,
        }));
    return items?.sort((a, b) => b.removedAt - a.removedAt);
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const key = "ui.panel.config.recently_removed";
    const items = this._items();
    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          this._isDevice ? `${key}.title_devices` : `${key}.title_entities`
        )}
      >
        <p class="intro">
          ${this._i18n.localize(
            this._isDevice ? `${key}.intro_devices` : `${key}.intro_entities`
          )}
        </p>
        ${
          this._forgetError
            ? html`<ha-alert alert-type="error">${this._forgetError}</ha-alert>`
            : nothing
        }
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : !items
              ? html`<ha-spinner></ha-spinner>`
              : !items.length
                ? html`<p class="empty">
                    ${this._i18n.localize(
                      this._isDevice
                        ? `${key}.empty_devices`
                        : `${key}.empty_entities`
                    )}
                  </p>`
                : html`<ha-list-base>
                    ${repeat(
                      items,
                      (item) => item.id,
                      (item) => this._renderItem(item)
                    )}
                  </ha-list-base>`
        }
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this._i18n.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderItem(item: RemovedItem) {
    const key = "ui.panel.config.recently_removed";
    const locale = this._i18n.locale;
    const area = item.areaId ? this._areas?.[item.areaId] : undefined;
    const labels = item.labels
      .map((labelId) => this._labels?.find((l) => l.label_id === labelId))
      .filter((label) => label !== undefined);
    const details = [
      ...item.details,
      // An unnamed device already has the integration in its headline.
      item.domain && !item.unnamed
        ? this._integrationName(item.domain)
        : undefined,
      area?.name,
    ].filter(Boolean);
    const removed = this._i18n.localize(`${key}.removed`, {
      time: relativeTime(new Date(item.removedAt * 1000), locale),
    });

    return html`<ha-list-item-base>
      ${
        item.domain
          ? html`<img
              slot="start"
              alt=""
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl(
                {
                  domain: item.domain,
                  type: "icon",
                  darkOptimized: this._ui.themes.darkMode,
                },
                this._connection.hassUrl()
              )}
            />`
          : nothing
      }
      <span slot="headline" class=${item.unnamed ? "unnamed" : ""}
        >${item.headline}</span
      >
      <div slot="supporting-text">
        ${details.length ? html`<div>${details.join(" · ")}</div>` : nothing}
        <div>
          ${removed}${
            item.orphanedAt !== null
              ? html` ·
                ${this._i18n.localize(`${key}.kept_until`, {
                  date: formatDate(
                    new Date((item.orphanedAt + ORPHANED_KEEP_SECONDS) * 1000),
                    locale,
                    this._hassConfig.config
                  ),
                })}`
              : nothing
          }
        </div>
        ${
          labels.length
            ? html`<div class="labels">
                ${labels.map(
                  (label) =>
                    html`<ha-label dense .color=${label.color ?? undefined}>
                      ${
                        label.icon
                          ? html`<ha-icon
                              slot="icon"
                              .icon=${label.icon}
                            ></ha-icon>`
                          : nothing
                      }
                      ${label.name}
                    </ha-label>`
                )}
              </div>`
            : nothing
        }
      </div>
      <ha-button
        slot="end"
        appearance="plain"
        variant="danger"
        size="s"
        data-id=${item.id}
        @click=${this._forget}
      >
        ${this._i18n.localize(`${key}.forget`)}
      </ha-button>
    </ha-list-item-base>`;
  }

  private async _forget(ev: Event) {
    const id = (ev.currentTarget as HTMLElement).dataset.id;
    const item = this._items()?.find((removed) => removed.id === id);
    if (!item) {
      return;
    }
    const key = "ui.panel.config.recently_removed";
    const confirmed = await showConfirmationDialog(this, {
      title: this._i18n.localize(
        this._isDevice
          ? `${key}.forget_device_title`
          : `${key}.forget_entity_title`
      ),
      text: this._i18n.localize(
        this._isDevice
          ? `${key}.forget_device_text`
          : `${key}.forget_entity_text`,
        { name: item.headline }
      ),
      confirmText: this._i18n.localize(`${key}.forget`),
      dismissText: this._i18n.localize("ui.common.cancel"),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    this._forgetError = undefined;
    try {
      await (this._isDevice
        ? forgetDeletedDeviceRegistryEntry(this._api.callWS, item.id)
        : forgetDeletedEntityRegistryEntry(this._api.callWS, item.id));
    } catch (err: any) {
      this._forgetError =
        err?.message ||
        this._i18n.localize(`${key}.forget_failed`, { name: item.headline });
    }
    // Forgetting fires no registry event, so the list is not pushed.
    await this._load();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .intro {
          margin-top: 0;
          color: var(--secondary-text-color);
        }
        .empty {
          text-align: center;
        }
        ha-spinner {
          display: block;
          margin: var(--ha-space-6) auto;
        }
        img {
          width: 32px;
          height: 32px;
        }
        .unnamed {
          font-style: italic;
        }
        [slot="headline"],
        [slot="supporting-text"] {
          white-space: normal;
        }
        .labels {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ha-space-1);
          margin-top: var(--ha-space-1);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-recently-removed": DialogRecentlyRemoved;
  }
}
