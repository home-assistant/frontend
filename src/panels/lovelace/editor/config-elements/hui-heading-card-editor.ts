import { mdiGestureTap, mdiListBox } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  any,
  array,
  assert,
  assign,
  enums,
  object,
  optional,
  string,
} from "superstruct";
import { listenMediaQuery } from "../../../../common/dom/media_query";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import { migrateHeadingCardConfig } from "../../cards/hui-heading-card";
import type { HeadingCardConfig } from "../../cards/types";
import { DEFAULT_VIEW_HEADER_BADGES_WRAP } from "../../views/hui-view-header";
import {
  ACTION_RELATED_CONTEXT,
  type UiAction,
} from "../../components/hui-action-editor";
import type {
  EntityHeadingBadgeConfig,
  LovelaceHeadingBadgeConfig,
} from "../../heading-badges/types";
import type { LovelaceCardEditor } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditSubElementEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import "./hui-heading-badges-editor";
import { getViewHeaderBadgesWrapFormSchema } from "../view-header/view-header-badges-wrap-form-schema";

const actions: UiAction[] = ["navigate", "url", "perform-action", "none"];

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    heading_style: optional(enums(["title", "subtitle"])),
    heading: optional(string()),
    icon: optional(string()),
    tap_action: optional(actionConfigStruct),
    badges: optional(array(any())),
    badges_wrap: optional(enums(["wrap", "scroll"])),
  })
);

@customElement("hui-heading-card-editor")
export class HuiHeadingCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HeadingCardConfig;

  @state({ attribute: false }) private narrow = false;

  private _unsubMql?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    this._unsubMql = listenMediaQuery("(max-width: 600px)", (matches) => {
      this.narrow = matches;
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubMql?.();
    this._unsubMql = undefined;
  }

  public setConfig(config: HeadingCardConfig): void {
    this._config = migrateHeadingCardConfig(config);
    assert(this._config, cardConfigStruct);
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "heading_style",
          selector: {
            select: {
              mode: "list",
              options: ["title", "subtitle"].map((value) => ({
                label: localize(
                  `ui.panel.lovelace.editor.card.heading.heading_style_options.${value}`
                ),
                value: value,
              })),
            },
          },
        },
        { name: "heading", selector: { text: {} } },
        {
          name: "icon",
          selector: {
            icon: {},
          },
        },
        {
          name: "interactions",
          type: "expandable",
          flatten: true,
          iconPath: mdiGestureTap,
          schema: [
            {
              name: "tap_action",
              selector: {
                ui_action: {
                  default_action: "none",
                  actions,
                },
              },
              context: ACTION_RELATED_CONTEXT,
            },
          ],
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _badges = memoizeOne(
    (badges: HeadingCardConfig["badges"]): LovelaceHeadingBadgeConfig[] =>
      badges || []
  );

  private _badgesWrapSchema = memoizeOne(
    (localize: LocalizeFunc, narrow: boolean) =>
      [getViewHeaderBadgesWrapFormSchema(localize, narrow)] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      ...this._config!,
    };

    if (!data.heading_style) {
      data.heading_style = "title";
    }

    const schema = this._schema(this.hass!.localize);
    const hasBadges = (this._config.badges?.length ?? 0) > 0;
    const badgesWrapData = {
      ...data,
      badges_wrap: data.badges_wrap || DEFAULT_VIEW_HEADER_BADGES_WRAP,
    };
    const badgesWrapSchema = this._badgesWrapSchema(
      this.hass.localize,
      this.narrow
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-expansion-panel outlined>
        <ha-svg-icon slot="leading-icon" .path=${mdiListBox}></ha-svg-icon>
        <h3 slot="header">
          ${this.hass!.localize("ui.panel.lovelace.editor.card.heading.badges")}
        </h3>
        <div class="content">
          <hui-heading-badges-editor
            .hass=${this.hass}
            .badges=${this._badges(this._config!.badges)}
            @heading-badges-changed=${this._badgesChanged}
            @edit-heading-badge=${this._editBadge}
          >
          </hui-heading-badges-editor>
          ${hasBadges
            ? html`
                <ha-form
                  class="features-form"
                  .hass=${this.hass}
                  .data=${badgesWrapData}
                  .schema=${badgesWrapSchema}
                  .computeLabel=${this._computeBadgesWrapLabel}
                  @value-changed=${this._valueChanged}
                ></ha-form>
              `
            : nothing}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _badgesChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const config = {
      ...this._config,
      badges: ev.detail.badges as LovelaceHeadingBadgeConfig[],
    };

    fireEvent(this, "config-changed", { config });
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const config: HeadingCardConfig = {
      ...this._config,
      ...(ev.detail.value as Partial<HeadingCardConfig>),
    };

    fireEvent(this, "config-changed", { config });
  }

  private _editBadge(ev: HASSDomEvent<{ index: number }>): void {
    ev.stopPropagation();
    const index = ev.detail.index;
    const config = this._badges(this._config!.badges)[index];

    fireEvent(this, "edit-sub-element", {
      config: config,
      saveConfig: (newConfig) => this._updateBadge(index, newConfig),
      type: "heading-badge",
    } as EditSubElementEvent<EntityHeadingBadgeConfig>);
  }

  private _updateBadge(index: number, entity: EntityHeadingBadgeConfig) {
    const badges = this._config!.badges!.concat();
    badges[index] = entity;
    const config = { ...this._config!, badges };
    fireEvent(this, "config-changed", {
      config: config,
    });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "heading_style":
      case "heading":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.heading.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeBadgesWrapLabel = (
    schema: SchemaUnion<ReturnType<typeof this._badgesWrapSchema>>
  ) =>
    schema.name === "badges_wrap"
      ? this.hass!.localize(
          "ui.panel.lovelace.editor.edit_view_header.settings.badges_wrap"
        )
      : "";

  static get styles() {
    return [
      configElementStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
        }
        ha-form {
          display: block;
          margin-bottom: var(--ha-space-6);
        }
        .features-form {
          margin-top: var(--ha-space-6);
          margin-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-card-editor": HuiHeadingCardEditor;
  }
}
