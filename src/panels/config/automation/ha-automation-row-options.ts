import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { createDurationData } from "../../../common/datetime/create_duration_data";
import { formatDurationNarrow } from "../../../common/datetime/format_duration";
import type { ForDict } from "../../../data/automation";
import { internationalizationContext } from "../../../data/context";

interface HaAutomationRowOptionsConfig {
  options?: {
    for?: string | number | ForDict;
    offset?: string | number | ForDict;
    offset_type?: "before" | "after";
  };
  timeout?: string | number | ForDict;
}

@customElement("ha-automation-row-options")
export class HaAutomationRowOptions extends LitElement {
  @property({ attribute: false }) public config!: HaAutomationRowOptionsConfig;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected render() {
    const supportedOptions = this._formatOptions(this.config);

    if (!supportedOptions.length) {
      return nothing;
    }

    return html`<span class="option">- ${supportedOptions.join(", ")}</span>`;
  }

  private _formatOptions = memoizeOne(
    (config: HaAutomationRowOptionsConfig): string[] => {
      const parts: string[] = [];

      if ("options" in config && config.options) {
        const options = config.options;

        const forDuration = this._duration(options.for);
        if (forDuration) {
          parts.push(
            `${this._i18n.localize("ui.panel.config.automation.editor.row_options.for")} ${forDuration}`
          );
        }

        const offsetDuration = this._duration(options.offset);
        if (offsetDuration) {
          const offsetType =
            options.offset_type === "before" ? "before" : "after";
          parts.push(
            this._i18n.localize(
              `ui.panel.config.automation.editor.row_options.offset_${offsetType}`,
              { offset: offsetDuration }
            )
          );
        }
      }

      if ("timeout" in config) {
        const timeoutDuration = this._duration(config.timeout);
        if (timeoutDuration) {
          parts.push(
            `${this._i18n.localize("ui.panel.config.automation.editor.row_options.timeout")} ${timeoutDuration}`
          );
        }
      }

      return parts;
    }
  );

  private _duration(value: unknown): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    const duration = createDurationData(
      value as string | number | ForDict | undefined
    );
    if (!duration) {
      return undefined;
    }
    return formatDurationNarrow(this._i18n.locale, duration);
  }

  static styles = css`
    .option {
      color: var(--ha-color-text-secondary);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-options": HaAutomationRowOptions;
  }
}
