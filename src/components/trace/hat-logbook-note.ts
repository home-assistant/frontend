import { css, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../common/translations/localize";

@customElement("hat-logbook-note")
class HatLogbookNote extends LitElement {
  @property() public domain: "automation" | "script" = "automation";

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  render() {
    if (this.domain === "script") {
      return this._localize(
        "ui.panel.config.automation.trace.messages.not_all_entries_are_related_script_note"
      );
    }
    return this._localize(
      "ui.panel.config.automation.trace.messages.not_all_entries_are_related_automation_note"
    );
  }

  static styles = css`
    :host {
      display: block;
      text-align: center;
      font-style: italic;
      padding: 16px;
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hat-logbook-note": HatLogbookNote;
  }
}
