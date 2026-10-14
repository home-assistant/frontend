import { mdiTextShort } from "@mdi/js";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../components/ha-form/types";

export interface TileContentFormConfig {
  hide_state?: boolean;
  state_content?: string | string[];
  vertical?: boolean;
  content_layout?: string;
}

export interface BadgeContentFormConfig {
  show_name?: boolean;
  show_state?: boolean;
  show_icon?: boolean;
  state_content?: string | string[];
  displayed_elements?: string[];
}

const colorSchema = {
  name: "color",
  selector: {
    ui_color: {
      default_color: "state",
      include_state: true,
    },
  },
} as const satisfies HaFormSchema;

export const contentLayoutSchema = (localize: LocalizeFunc) =>
  ({
    name: "content_layout",
    required: true,
    selector: {
      select: {
        mode: "box",
        options: ["horizontal", "vertical"].map((value) => ({
          label: localize(
            `ui.panel.lovelace.editor.card.tile.content_layout_options.${value}`
          ),
          value,
          image: {
            src: `/static/images/form/tile_content_layout_${value}.svg`,
            src_dark: `/static/images/form/tile_content_layout_${value}_dark.svg`,
            flip_rtl: true,
          },
        })),
      },
    },
  }) as const satisfies HaFormSchema;

export const displayedElementsSchema = (localize: LocalizeFunc) =>
  ({
    name: "displayed_elements",
    selector: {
      select: {
        mode: "list",
        multiple: true,
        options: (["name", "state", "icon"] as const).map((value) => ({
          value,
          label: localize(
            `ui.panel.lovelace.editor.badge.entity.displayed_elements_options.${value}`
          ),
        })),
      },
    },
  }) as const satisfies HaFormSchema;

export const tileContentSchema = (
  localize: LocalizeFunc,
  showTimeFormat: boolean
) =>
  ({
    name: "content",
    flatten: true,
    type: "expandable",
    iconPath: mdiTextShort,
    schema: [
      {
        name: "name",
        selector: {
          entity_name: {},
        },
        context: { entity: "entity" },
      },
      {
        name: "",
        type: "grid",
        schema: [
          {
            name: "icon",
            selector: {
              icon: {},
            },
            context: { icon_entity: "entity" },
          },
          colorSchema,
          {
            name: "show_entity_picture",
            selector: {
              boolean: {},
            },
          },
          {
            name: "hide_state",
            selector: {
              boolean: {},
            },
          },
        ],
      },
      {
        name: "state_content",
        visible: { field: "hide_state", operator: "not_eq", value: true },
        selector: {
          ui_state_content: {
            allow_context: true,
          },
        },
        context: {
          filter_entity: "entity",
        },
      },
      {
        name: "time_format",
        visible: showTimeFormat,
        selector: {
          ui_time_format: {},
        },
      },
      contentLayoutSchema(localize),
    ],
  }) as const satisfies HaFormSchema;

export const badgeContentSchema = (
  localize: LocalizeFunc,
  showTimeFormat: boolean
) =>
  ({
    name: "content",
    type: "expandable",
    flatten: true,
    iconPath: mdiTextShort,
    schema: [
      {
        name: "name",
        selector: {
          entity_name: {},
        },
        context: { entity: "entity" },
      },
      {
        name: "",
        type: "grid",
        schema: [
          colorSchema,
          {
            name: "icon",
            selector: {
              icon: {},
            },
            context: { icon_entity: "entity" },
          },
          {
            name: "show_entity_picture",
            selector: {
              boolean: {},
            },
          },
        ],
      },
      displayedElementsSchema(localize),
      {
        name: "state_content",
        selector: {
          ui_state_content: {
            allow_name: true,
          },
        },
        context: {
          filter_entity: "entity",
        },
      },
      {
        name: "time_format",
        visible: showTimeFormat,
        selector: {
          ui_time_format: {},
        },
      },
    ],
  }) as const satisfies HaFormSchema;

export const tileContentFormData = <T extends TileContentFormConfig>(
  config: T
): T => ({
  ...config,
  content_layout: config.vertical ? "vertical" : "horizontal",
});

export const tileContentConfigFromForm = <T extends TileContentFormConfig>(
  value: T
): T => {
  const config = { ...value };

  if (config.hide_state || !config.state_content) {
    delete config.state_content;
  }

  if (config.content_layout) {
    config.vertical = config.content_layout === "vertical";
    delete config.content_layout;
  }

  return config;
};

export const badgeContentFormData = <T extends BadgeContentFormConfig>(
  config: T
): T => ({
  ...config,
  displayed_elements: [
    ...(config.show_name ? ["name"] : []),
    ...(config.show_state ? ["state"] : []),
    ...(config.show_icon ? ["icon"] : []),
  ],
});

export const badgeContentConfigFromForm = <T extends BadgeContentFormConfig>(
  value: T
): T => {
  const config = { ...value };

  if (!config.state_content) {
    delete config.state_content;
  }

  if (config.displayed_elements) {
    config.show_name = config.displayed_elements.includes("name");
    config.show_state = config.displayed_elements.includes("state");
    config.show_icon = config.displayed_elements.includes("icon");
    delete config.displayed_elements;
  }

  return config;
};
