import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { formatDateTimeWithSeconds } from "../../common/datetime/format_date_time";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-alert";
import "../../components/ha-relative-time";
import "../../components/ha-spinner";
import { fetchDateWS } from "../../data/history";
import type { LogbookEntry } from "../../data/logbook";
import type { HassDialog } from "../../dialogs/make-dialog-manager";
import {
  buttonLinkStyle,
  haStyle,
  haStyleDialog,
} from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "./ha-logbook-chain";
import type { LogbookChain } from "./logbook-chain-resolver";
import { resolveLogbookChain } from "./logbook-chain-resolver";
import type { LogbookItem } from "./logbook-entry-model";
import { computeLogbookItem } from "./logbook-entry-model";
import {
  entityNameButtonStyle,
  renderEntityName,
  transitionArrow,
} from "./logbook-entry-templates";
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
    const subjectKey =
      item.category === "entity"
        ? "entity"
        : item.category === "automation"
          ? entry.domain === "script"
            ? "script"
            : "automation"
          : "integration";

    return html`
      <div class="box">
        <div class="row">
          <span class="label">
            ${this.hass.localize(
              `ui.dialogs.logbook_detail.${subjectKey}` as LocalizeKeys
            )}
          </span>
          <span class="value">
            ${renderEntityName(this.hass, item.name, entry.entity_id)}
            ${
              item.context
                ? html`<span class="sub">${item.context}</span>`
                : nothing
            }
          </span>
        </div>
        ${
          transition
            ? html`
                <div class="row">
                  <span class="label">
                    ${this.hass.localize("ui.dialogs.logbook_detail.state")}
                  </span>
                  <span class="value">
                    ${
                      transition.oldState
                        ? html`<span class="old-state"
                              >${transition.oldState}</span
                            ><span class="arrow"
                              >${transitionArrow(this.hass)}</span
                            >`
                        : nothing
                    }<span class="new-state">${transition.newState}</span>
                  </span>
                </div>
              `
            : item.value
              ? html`
                  <div class="row">
                    <span class="label">
                      ${this.hass.localize("ui.dialogs.logbook_detail.event")}
                    </span>
                    <span class="value">${item.value.text}</span>
                  </div>
                `
              : nothing
        }
        <div class="row">
          <span class="label">
            ${this.hass.localize("ui.dialogs.logbook_detail.time")}
          </span>
          <span class="value time-value">
            ${formatDateTimeWithSeconds(
              when,
              this.hass.locale,
              this.hass.config
            )}
            <span class="sub">
              <ha-relative-time .datetime=${when} capitalize></ha-relative-time>
            </span>
          </span>
        </div>
      </div>
    `;
  }

  private _renderWhatHappened(entry: LogbookEntry) {
    return html`
      <div class="section">
        <h3 class="section-title">
          ${this.hass.localize("ui.dialogs.logbook_detail.what_happened")}
        </h3>
        ${
          this._error
            ? html`<ha-alert alert-type="warning">
                ${this.hass.localize("ui.components.logbook.retrieval_error")}
              </ha-alert>`
            : nothing
        }
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
      </div>
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
      buttonLinkStyle,
      entityNameButtonStyle,
      css`
        .content {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }

        .box {
          border: 1px solid var(--divider-color);
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          overflow: hidden;
        }

        .box > .row + .row {
          border-top: 1px solid var(--divider-color);
        }

        .row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          min-height: 48px;
          padding: var(--ha-space-2) var(--ha-space-4);
          box-sizing: border-box;
        }

        .row .label {
          color: var(--secondary-text-color);
          flex-shrink: 0;
        }

        .row .value {
          flex: 1;
          min-width: 0;
          text-align: end;
          overflow-wrap: anywhere;
        }

        .value .name {
          font-weight: var(--ha-font-weight-medium);
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

        .section-title {
          margin: 0 0 var(--ha-space-2);
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }

        /* Reserved at two chain rows, the typical chain height, so the swap
           from spinner to content barely moves the dialog. */
        .chain-area {
          display: grid;
          min-height: 114px;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
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
