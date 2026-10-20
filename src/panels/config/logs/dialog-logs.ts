import type { ContextType } from "@lit/context";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
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
        <error-log-card
          .header=${this.params.title}
          .provider=${this.params.provider}
          .filter=${this._filter}
        ></error-log-card>
      </ha-dialog>
    `;
  }

  private _filterChanged(ev: InputEvent) {
    this._filter = (ev.target as HTMLInputElement).value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-input-search {
          display: block;
          margin-bottom: var(--ha-space-2);
        }
        error-log-card {
          --error-log-card-height: calc(100vh - 340px);
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
