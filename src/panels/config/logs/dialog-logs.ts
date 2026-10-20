import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-dialog";
import "../../../components/input/ha-input-search";
import { internationalizationContext } from "../../../data/context";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { haStyleDialog } from "../../../resources/styles";
import "./error-log-card";
import type { LogsDialogParams } from "./show-dialog-logs";

@customElement("dialog-logs")
class LogsDialog extends DialogMixin<LogsDialogParams>(LitElement) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _filter = "";

  // Set when the filter the dialog opened with matched none of the loaded lines.
  @state() private _unmatchedFilter?: string;

  private _checkInitialFilter = false;

  public connectedCallback() {
    super.connectedCallback();
    this._filter = this.params?.filter ?? "";
    this._checkInitialFilter = Boolean(this.params?.filter);
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    // The log card's strings live in the config fragment, which isn't loaded on dashboards.
    this._i18n.loadFragmentTranslation("config");
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`
      <ha-dialog open header-title=${this.params.title} width="large">
        <ha-input-search
          appearance="outlined"
          .value=${this._filter}
          .placeholder=${this._i18n.localize("ui.panel.config.logs.search")}
          @input=${this._filterChanged}
        ></ha-input-search>
        ${
          this._unmatchedFilter
            ? html`<ha-alert alert-type="info">
                ${this._i18n.localize(
                  "ui.panel.config.logs.no_matches_showing_all",
                  { term: this._unmatchedFilter }
                )}
              </ha-alert>`
            : nothing
        }
        <error-log-card
          .header=${this.params.title}
          .provider=${this.params.provider}
          .filter=${this._filter}
          class=${this._unmatchedFilter ? "with-alert" : ""}
          @log-search-result=${this._handleSearchResult}
        ></error-log-card>
      </ha-dialog>
    `;
  }

  private _filterChanged(ev: InputEvent) {
    this._filter = (ev.target as HTMLInputElement).value;
    this._checkInitialFilter = false;
    this._unmatchedFilter = undefined;
  }

  // Lines for a failed update don't always name the app, so fall back to all lines.
  private _handleSearchResult(
    ev: HASSDomEvent<HASSDomEvents["log-search-result"]>
  ) {
    const { filter, found } = ev.detail;

    if (!this._checkInitialFilter || filter !== this._filter) {
      return;
    }

    this._checkInitialFilter = false;

    if (!found) {
      this._unmatchedFilter = filter;
      this._filter = "";
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-input-search,
        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-2);
        }
        error-log-card {
          --error-log-card-margin: 0;
          --error-log-card-height: calc(100vh - 320px);
        }
        error-log-card.with-alert {
          --error-log-card-height: calc(100vh - 368px);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-logs": LogsDialog;
  }
}
