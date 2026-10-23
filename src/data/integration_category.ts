import type { LocalizeFunc } from "../common/translations/localize";
import type { IntegrationCategoryIcons } from "./icons";

const TRANSLATION_KEY = "component.homeassistant.integration_category";

// The name of a category, like `energy`, or of a subcategory, like
// `energy.solar`. Empty for one this Home Assistant doesn't know.
export const integrationCategoryName = (
  localize: LocalizeFunc,
  slug: string
): string => {
  const [category, subcategory] = slug.split(".");
  return subcategory
    ? localize(
        `${TRANSLATION_KEY}.${category}.subcategory.${subcategory}.name` as any
      )
    : localize(`${TRANSLATION_KEY}.${category}.name` as any);
};

export const integrationCategoryIcon = (
  icons: IntegrationCategoryIcons | undefined,
  slug: string
): string | undefined => {
  const [category, subcategory] = slug.split(".");
  return subcategory
    ? icons?.[category]?.subcategory?.[subcategory]?.default
    : icons?.[category]?.default;
};

// In a category when it lists the category itself, or one of its
// subcategories. A subcategory only matches itself.
export const inIntegrationCategory = (
  categories: string[] | undefined,
  slug: string
): boolean =>
  (categories ?? []).some(
    (category) => category === slug || category.startsWith(`${slug}.`)
  );
