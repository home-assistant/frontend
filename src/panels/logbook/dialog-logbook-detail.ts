import { mdiPuzzle } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-alert";
import "../../components/ha-icon";
import "../../components/ha-icon-next";
import "../../components/ha-relative-time";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-base";
import "../../components/item/ha-list-item-button";
import "../../components/item/ha-list-item-value";
import "../../components/list/ha-grouped-list";
import { fetchDateWS } from "../../data/history";
import type { LogbookEntry } from "../../data/logbook";
import type { HassDialog } from "../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "./ha-logbook-chain";
import type { LogbookChain } from "./logbook-chain-resolver";
import { resolveLogbookChain } from "./logbook-chain-resolver";
import type { LogbookItem } from "./logbook-entry-model";
import { computeLogbookItem } from "./logbook-entry-model";
import { renderLogbookGlyph, transitionArrow } from "./logbook-entry-templates";
import type { LogbookDetailDialogParams } from "./show-dialog-logbook-detail";

@customElement("dialog-logbook-detail")
class DialogLogbookDetail
  extends LitElement
  implements HassDialog<LogbookDetailDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LogbookDetailDialogParams;

  @state() private _open = false;

  @state() private _chain?: LogbookChain;

  @state() private _previousState?: string;

  @state() private _error = false;

  public showDialog(params: LogbookDetailDialogParams): void {
    this._params = params;
    this._open = true;
    this._chain = undefined;
    this._previousState = undefined;
    this._error = false;
    if (
      params.entry.context_event_type === "call_service" &&
      params.entry.context_domain
    ) {
      this.hass.loadBackendTranslation("services", params.entry.context_domain);
    }
    this._loadDetails();
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._chain = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  // Both fetches resolve into a single render so the dialog reflows once.
  private async _loadDetails() {
    const { entry } = this._params!;
    const [{ chain, errored }, previousState] = await Promise.all([
      this._fetchChain(entry),
      this._fetchPreviousState(entry),
    ]);
    if (this._params?.entry !== entry) {
      return;
    }
    this._error = errored;
    this._chain = chain;
    this._previousState = previousState;
  }

  private async _fetchChain(
    entry: LogbookEntry
  ): Promise<{ chain: LogbookChain; errored: boolean }> {
    const { userIdToName, systemUserIds } = this._params!;
    const options = { userIdToName, systemUserIds };
    const resolveWithoutFetch = () =>
      resolveLogbookChain(this.hass, entry, options, async () => []);
    try {
      const chain = isComponentLoaded(this.hass.config, "logbook")
        ? await resolveLogbookChain(this.hass, entry, options)
        : await resolveWithoutFetch();
      return { chain, errored: false };
    } catch {
      return { chain: await resolveWithoutFetch(), errored: true };
    }
  }

  // The feed the row was clicked in can be filtered or partially loaded, so
  // the state active just before the entry is resolved from history instead.
  private async _fetchPreviousState(
    entry: LogbookEntry
  ): Promise<string | undefined> {
    if (
      !entry.entity_id ||
      entry.state === undefined ||
      !isComponentLoaded(this.hass.config, "history")
    ) {
      return undefined;
    }
    const end = new Date(entry.when * 1000);
    const start = new Date(end.getTime() - 1);
    try {
      const states = await fetchDateWS(this.hass, start, end, [
        entry.entity_id,
      ]);
      return states[entry.entity_id]?.[0]?.s;
    } catch {
      // The row is still useful without an old state.
      return undefined;
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const { entry } = this._params;
    const item = computeLogbookItem(this.hass, entry);

    return html`
      <ha-adaptive-dialog
        .open=${this._open}
        header-title=${this.hass.localize("ui.dialogs.logbook_detail.title")}
        @closed=${this._dialogClosed}
        @hass-more-info=${this._moreInfoOpened}
      >
        <div class="content">
          ${this._renderFacts(item, entry)} ${this._renderWhatHappened(entry)}
        </div>
      </ha-adaptive-dialog>
    `;
  }

  private _renderFacts(item: LogbookItem, entry: LogbookEntry) {
    const stateObj = entry.entity_id
      ? this.hass.states[entry.entity_id]
      : undefined;
    const transition = this._transitionValues(item, entry, stateObj);
    const when = this._entryDate(item.when);

    return html`
      <ha-grouped-list>
        ${this._renderSubjectRow(item, entry)}
        ${
          transition
            ? html`
                <ha-list-item-value
                  .label=${this.hass.localize(
                    "ui.dialogs.logbook_detail.state"
                  )}
                >
                  ${
                    transition.oldState
                      ? html`<span class="old-state"
                            >${transition.oldState}</span
                          ><span class="arrow"
                            >${transitionArrow(this.hass)}</span
                          >`
                      : nothing
                  }<span class="new-state">${transition.newState}</span>
                </ha-list-item-value>
              `
            : item.value
              ? html`
                  <ha-list-item-value
                    .label=${this.hass.localize(
                      "ui.dialogs.logbook_detail.event"
                    )}
                  >
                    ${item.value.text}
                  </ha-list-item-value>
                `
              : nothing
        }
        <ha-list-item-value
          class="time-value"
          .label=${this.hass.localize("ui.dialogs.logbook_detail.time")}
        >
          ${formatDateTimeWithSeconds(when, this.hass.locale, this.hass.config)}
          <span class="sub">
            <ha-relative-time .datetime=${when} capitalize></ha-relative-time>
          </span>
        </ha-list-item-value>
      </ha-grouped-list>
    `;
  }

  // Mirrors the target picker: icon, name, area ▸ device.
  private _renderSubjectRow(item: LogbookItem, entry: LogbookEntry) {
    const icon = html`<span class="subject-icon" slot="start">
      ${this._renderSubjectIcon(item, entry)}
    </span>`;

    if (!entry.entity_id || !(entry.entity_id in this.hass.states)) {
      return html`
        <ha-list-item-base
          .headline=${item.name}
          .supportingText=${item.context}
        >
          ${icon}
        </ha-list-item-base>
      `;
    }

    return html`
      <ha-list-item-button
        .headline=${item.name}
        .supportingText=${item.context}
        .entityId=${entry.entity_id}
        @click=${this._entityClicked}
      >
        ${icon}
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  // The feed draws brand rows as a brands image, which stays blank for the
  // integrations that have none. An integration domain resolves to no domain
  // icon either, so fall back to the chain's own integration glyph.
  private _renderSubjectIcon(item: LogbookItem, entry: LogbookEntry) {
    if (item.glyph.type !== "brand") {
      return renderLogbookGlyph(this.hass, entry, item.glyph);
    }
    return item.glyph.icon
      ? html`<ha-icon .icon=${item.glyph.icon}></ha-icon>`
      : html`<ha-svg-icon .path=${mdiPuzzle}></ha-svg-icon>`;
  }

  private _entityClicked(ev: Event) {
    const target = ev.currentTarget as HTMLElement & { entityId: string };
    fireEvent(target, "hass-more-info", { entityId: target.entityId });
  }

  private _renderWhatHappened(entry: LogbookEntry) {
    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize("ui.components.logbook.retrieval_error")}
            </ha-alert>`
          : nothing
      }
      <ha-grouped-list
        .header=${this.hass.localize("ui.dialogs.logbook_detail.what_happened")}
      >
        <div class="chain-area">
          ${
            this._chain === undefined
              ? html`<div class="loading"><ha-spinner></ha-spinner></div>`
              : html`<ha-logbook-chain
                  .hass=${this.hass}
                  .chain=${this._chain}
                  .subject=${entry}
                  .traceContexts=${this._params?.traceContexts ?? {}}
                ></ha-logbook-chain>`
          }
        </div>
      </ha-grouped-list>
    `;
  }

  private _entryDate = memoizeOne((when: number) => new Date(when));

  private _transitionValues(
    item: LogbookItem,
    entry: LogbookEntry,
    stateObj?: HassEntity
  ): { oldState?: string; newState: string } | undefined {
    if (item.category !== "entity" || entry.state === undefined) {
      return undefined;
    }
    const newState = stateObj
      ? this.hass.formatEntityState(stateObj, entry.state)
      : entry.state;
    const previousState = this._previousState;
    const oldState =
      previousState !== undefined && previousState !== entry.state
        ? stateObj
          ? this.hass.formatEntityState(stateObj, previousState)
          : previousState
        : undefined;
    return { oldState, newState };
  }

  private _moreInfoOpened() {
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .content {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }

        ha-list-item-button,
        ha-list-item-base {
          --ha-row-item-gap: var(--ha-space-3);
          --ha-row-item-min-height: 56px;
        }

        /* Match the weight the chain gives its own row names. */
        ha-list-item-button::part(headline),
        ha-list-item-base::part(headline) {
          font-weight: var(--ha-font-weight-medium);
        }

        .subject-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          color: var(--secondary-text-color);
          --state-icon-color: var(--secondary-text-color);
        }

        .subject-icon state-badge {
          width: 32px;
          height: 32px;
          margin: 0;
        }

        ha-icon-next {
          color: var(--secondary-text-color);
        }

        .sub {
          display: block;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }

        .old-state {
          color: var(--secondary-text-color);
        }

        .arrow {
          color: var(--disabled-color);
          padding: 0 4px;
        }

        .new-state {
          font-weight: var(--ha-font-weight-medium);
        }

        .time-value {
          font-variant-numeric: tabular-nums;
        }

        ha-relative-time {
          display: contents;
        }

        /* minmax(0, 1fr) lets the chain shrink: a grid item defaults to its
           min-content width, which a long automation name blows past. */
        .chain-area {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }

        /* Held at two chain rows, the typical chain height, so the swap from
           spinner to content barely moves the dialog. The resolved content
           sizes itself — a lone "no cause" line must not sit in a tall box. */
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 114px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-logbook-detail": DialogLogbookDetail;
  }
}
