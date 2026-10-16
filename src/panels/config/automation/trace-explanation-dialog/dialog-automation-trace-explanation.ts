import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-markdown";
import "../../../../components/ha-spinner";
import { generateDataAITask } from "../../../../data/ai_task";
import {
  apiContext,
  internationalizationContext,
} from "../../../../data/context";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import type { AutomationTraceExplanationDialogParams } from "./show-dialog-automation-trace-explanation";

@customElement("dialog-automation-trace-explanation")
class DialogAutomationTraceExplanation extends DialogMixin<AutomationTraceExplanationDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _explanation?: string;

  @state() private _error?: string;

  connectedCallback() {
    super.connectedCallback();
    this._explain();
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        .headerTitle=${this._i18n.localize(
          "ui.panel.config.automation.trace.explanation.title"
        )}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : this._explanation === undefined
              ? html`
                  <div class="loading">
                    <ha-spinner></ha-spinner>
                    ${this._i18n.localize(
                      "ui.panel.config.automation.trace.explanation.generating"
                    )}
                  </div>
                `
              : html`<ha-markdown .content=${this._explanation}></ha-markdown>`
        }
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this._i18n.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _explain() {
    if (!this.params) {
      return;
    }
    const { trace, logbookEntries } = this.params;
    try {
      const result = await generateDataAITask(this._api, {
        task_name: "Explain automation trace",
        instructions: `A Home Assistant user is debugging an automation. Below is the trace of one automation run as JSON. It contains the automation config, the trigger, the steps that ran with their results and changed variables, any errors, and the related logbook entries.

Explain to the user what happened during this run. Say what triggered the automation, which conditions passed or failed, which actions ran, and how the run ended. If the run failed or did not do what the config intends, give the most likely cause. Keep it short and use Markdown. Answer in the language with code "${this._i18n.language}".

${JSON.stringify({ trace, logbookEntries })}`,
      });
      this._explanation = result.data;
    } catch (err: any) {
      this._error = err?.message || String(err);
    }
  }

  static styles = css`
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-4);
      padding: var(--ha-space-6) 0;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-automation-trace-explanation": DialogAutomationTraceExplanation;
  }
}
