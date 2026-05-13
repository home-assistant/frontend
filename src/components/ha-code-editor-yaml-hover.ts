import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { YamlFieldSchema } from "../resources/yaml_field_schema";

/**
 * Tooltip element rendered inside a CodeMirror hoverTooltip for YAML field
 * keys in the automation / script / card YAML editors.
 *
 * Shows:
 *   - Field name (monospace)
 *   - "required" badge when applicable
 *   - Description paragraph
 *   - Selector type hint
 *   - Example value
 *   - Default value
 */
@customElement("ha-code-editor-yaml-hover")
export class HaCodeEditorYamlHover extends LitElement {
  @property({ attribute: false }) public fieldName = "";

  @property({ attribute: false }) public fieldSchema!: YamlFieldSchema;

  /**
   * Optional localize callback forwarded from the editor so translated
   * descriptions can be rendered.  When absent, strings are shown verbatim.
   */
  @property({ attribute: false }) public localize?: (
    key: string,
    ...args: unknown[]
  ) => string;

  render() {
    const schema = this.fieldSchema;
    if (!schema) return nothing;

    const description = schema.description
      ? (this.localize ? this.localize(schema.description) : "") ||
        schema.description
      : undefined;

    const selectorType = schema.selector
      ? Object.keys(schema.selector)[0]
      : undefined;

    return html`
      <div class="header">
        <code class="key">${this.fieldName}</code>
        ${schema.required
          ? html`<span class="badge required">required</span>`
          : nothing}
        ${selectorType
          ? html`<span class="badge type">${selectorType}</span>`
          : nothing}
      </div>
      ${description ? html`<div class="desc">${description}</div>` : nothing}
      ${schema.example != null
        ? html`<div class="meta">
            <span class="meta-label">Example:</span>
            <code>${String(schema.example)}</code>
          </div>`
        : nothing}
      ${schema.default != null
        ? html`<div class="meta">
            <span class="meta-label">Default:</span>
            <code>${String(schema.default)}</code>
          </div>`
        : nothing}
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: 6px 10px;
      max-width: 320px;
      line-height: 1.5;
      font-size: 0.9em;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    code.key {
      font-family: var(--ha-font-family-code);
      font-size: 1em;
      font-weight: bold;
    }

    .badge {
      display: inline-block;
      border-radius: 4px;
      padding: 0 5px;
      font-size: 0.78em;
      line-height: 1.6;
      font-family: var(--ha-font-family-body);
    }

    .badge.required {
      background: color-mix(
        in srgb,
        var(--error-color, #db4437) 15%,
        transparent
      );
      color: var(--error-color, #db4437);
    }

    .badge.type {
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
      color: var(--primary-text-color);
    }

    .desc {
      color: var(--secondary-text-color);
      margin-bottom: 4px;
    }

    .meta {
      display: flex;
      gap: 6px;
      align-items: baseline;
      color: var(--secondary-text-color);
    }

    .meta-label {
      font-size: 0.85em;
      opacity: 0.75;
      flex-shrink: 0;
    }

    .meta code {
      font-family: var(--ha-font-family-code);
      font-size: 0.9em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-code-editor-yaml-hover": HaCodeEditorYamlHover;
  }
}
