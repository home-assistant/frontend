import type { PropertyValues, TemplateResult, CSSResultGroup } from "lit";
import { html, css, nothing, LitElement } from "lit";
import { mdiHelpCircle } from "@mdi/js";
import { property, state } from "lit/decorators";
import yaml from "js-yaml";
import "../../../layouts/hass-subpage";
import { ContextProvider } from "@lit/context";
import type { HomeAssistant, Route } from "../../../types";
import "../../../components/ha-fab";
import "../../../components/ha-button-menu";
import "../../../components/ha-list-item";
import type {
  Blueprint,
  BlueprintDomain,
  BlueprintInput,
  Blueprints
} from "../../../data/blueprint";
import {
  BlueprintYamlSchema,
  yamlSchemaContext,
  getBlueprint,
  getBlueprintEditorInitData,
} from "../../../data/blueprint";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { documentationUrl } from "../../../util/documentation-url";
import "./input/ha-blueprint-input";
import { haStyle } from "../../../resources/styles";
import { fireEvent } from "../../../common/dom/fire_event";

export abstract class HaBlueprintGenericEditor extends PreventUnsavedMixin(
  KeyboardShortcutMixin(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public blueprints!: Record<
    BlueprintDomain,
    Blueprints
  >;

  @property({ attribute: "blueprint-path" }) public blueprintPath!: string;

  @state() protected _readOnly = false;

  @state() private _blueprintPath?: string;

  protected abstract _blueprint: Blueprint | undefined;

  protected abstract _domain: BlueprintDomain;

  protected abstract getDefaultBlueprint(): Blueprint;

  protected abstract renderEditor(): TemplateResult | symbol;

  protected abstract renderHeader(): TemplateResult | symbol;

  protected abstract normalizeBlueprint(
    blueprint: Partial<Blueprint>
  ): Blueprint;

  public _schemaProvider = new ContextProvider(this, {
    context: yamlSchemaContext,
    initialValue: BlueprintYamlSchema,
  });

  protected _valueChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();

    this._blueprint = ev.detail.value;
    this._updateInputsInHass();
    if (this._readOnly) {
      return;
    }
    fireEvent(this, "value-changed", { value: this._blueprint });
  }

  private async _loadBlueprint() {
    try {
      const blueprintGetResult = await getBlueprint(
        this.hass,
        this._domain,
        this._blueprintPath!
      );
      const blueprint = yaml.load(blueprintGetResult.yaml, {
        schema: BlueprintYamlSchema,
      }) as Blueprint;
      this._readOnly = false;
      this._blueprint = this.normalizeBlueprint(blueprint);
      this._updateInputsInHass();
      fireEvent(this, "value-changed", { value: this._blueprint });
    } catch (err: any) {
      await showAlertDialog(this, {
        text:
          err.status_code === 404
            ? this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.load_error_not_editable"
              )
            : this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.load_error_unknown",
                { err_no: err.status_code }
              ),
      });
      history.back();
    }
  }

  private _inputChanged(
    ev: CustomEvent<{ value: [string, BlueprintInput][] }>
  ) {
    ev.stopPropagation();
    const input = ev.detail.value.reduce(
      (acc, [key, i]) => ({ ...acc, [key]: i }),
      {}
    );
    const blueprint = this._blueprint
      ? this._blueprint
      : this.getDefaultBlueprint();
    this._blueprint = {
      ...blueprint,
      metadata: {
        ...blueprint.metadata,
        input,
      },
    };
    fireEvent(this, "value-changed", { value: this._blueprint });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    const oldBlueprintPath = changedProps.get("blueprintPath");
    if (
      (changedProps.has("blueprintPath") || changedProps.has("blueprints")) &&
      this.blueprintPath &&
      this.hass &&
      // Only refresh config if we picked a new blueprint. If same ID, don't fetch it.
      oldBlueprintPath !== this.blueprintPath
    ) {
      this._blueprintPath = this.blueprintPath;
      this._loadBlueprint();
    }

    if (changedProps.has("blueprintPath") && !this.blueprintPath && this.hass) {
      const initData = getBlueprintEditorInitData();
      this._blueprint = {
        ...this.getDefaultBlueprint(),
        ...(initData ? this.normalizeBlueprint(initData) : initData),
      } as Blueprint;
      this._blueprintPath = undefined;
      this._readOnly = false;
      fireEvent(this, "value-changed", { value: this._blueprint });
    }
  }

  protected render() {
    if (!this._blueprint) {
      return nothing;
    }

    return html`
      <div class="editor-content">
        <div class="header">
          <h2 id="variables-heading" class="name">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.blueprints.editor.inputs.header"
            )}
          </h2>
          <a
            href=${documentationUrl(this.hass, "/docs/blueprint/variable/")}
            target="_blank"
            rel="noreferrer"
          >
            <ha-icon-button
              .path=${mdiHelpCircle}
              .label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.inputs.learn_more"
              )}
            ></ha-icon-button>
          </a>
        </div>
        ${!Object.entries(this._blueprint?.metadata?.input || {})?.length
          ? html`<p class="section-description">
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.inputs.section_description"
              )}
            </p>`
          : nothing}

        <ha-blueprint-input
          role="region"
          aria-labelledby="inputs-heading"
          .inputs=${Object.entries(this._blueprint?.metadata?.input || {})}
          @value-changed=${this._inputChanged}
          .hass=${this.hass}
          .disabled=${this._readOnly}
        ></ha-blueprint-input>

        ${this.renderEditor()}
      </div>
    `;
  }

  private _updateInputsInHass() {
    // TODO: Add temporary inputs to HASS object to be consumed by pickers
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    // TODO: Remove temporary inputs from HASS object
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding-bottom: 20px;
        }
        .yaml-mode {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
        }
        .editor-content,
        :not(.yaml-mode) > ha-alert {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
          display: block;
        }
        ha-yaml-editor {
          flex-grow: 1;
          --actions-border-radius: 0;
          --code-mirror-height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
        }
        ha-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: 0;
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
        ha-button-menu a {
          text-decoration: none;
          color: var(--primary-color);
        }
        h1 {
          margin: 0;
        }
        .header-name {
          display: flex;
          align-items: center;
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
        }
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
        }
        .description {
          margin: 0;
        }
        p {
          margin-top: 0;
        }
        .header {
          margin-top: 16px;

          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: -16px;
        }
        .header .name {
          font-weight: 400;
          flex: 1;
          margin-bottom: 8px;
        }
        .header a {
          color: var(--secondary-text-color);
        }
        .header .small {
          font-size: small;
          font-weight: normal;
          line-height: 0;
        }
        .section-description {
          margin-bottom: 16px;
        }

        ha-blueprint-input {
          display: block;
          margin-bottom: 16px;
        }
        
        manual-automation-editor, manual-script-editor {
          margin-top: -48px;
        }
      `,
    ];
  }
}
