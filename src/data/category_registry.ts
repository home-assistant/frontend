import { Connection, createCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import { stringCompare } from "../common/string/compare";
import { HomeAssistant } from "../types";
import { debounce } from "../common/util/debounce";

export interface CategoryRegistryEntry {
  category_id: string;
  name: string;
  icon: string | null;
}

export interface CategoryRegistryEntryMutableParams {
  name: string;
  icon?: string | null;
}

export const fetchCategoryRegistry = (conn: Connection, scope: string) =>
  conn
    .sendMessagePromise<CategoryRegistryEntry[]>({
      type: "config/category_registry/list",
      scope,
    })
    .then((categories) =>
      categories.sort((ent1, ent2) => stringCompare(ent1.name, ent2.name))
    );

export const subscribeCategoryRegistry = (
  conn: Connection,
  scope: string,
  onChange: (floors: CategoryRegistryEntry[]) => void
) =>
  createCollection<CategoryRegistryEntry[]>(
    `_categoryRegistry_${scope}`,
    (conn2: Connection) => fetchCategoryRegistry(conn2, scope),
    (conn2: Connection, store: Store<CategoryRegistryEntry[]>) =>
      conn2.subscribeEvents(
        debounce(
          () =>
            fetchCategoryRegistry(conn2, scope).then(
              (categories: CategoryRegistryEntry[]) =>
                store.setState(categories, true)
            ),
          500,
          true
        ),
        "category_registry_updated"
      ),
    conn,
    onChange
  );

export const createCategoryRegistryEntry = (
  hass: HomeAssistant,
  scope: string,
  values: CategoryRegistryEntryMutableParams
) =>
  hass.callWS<CategoryRegistryEntry>({
    type: "config/category_registry/create",
    scope,
    ...values,
  });

export const updateCategoryRegistryEntry = (
  hass: HomeAssistant,
  scope: string,
  category_id: string,
  updates: Partial<CategoryRegistryEntryMutableParams>
) =>
  hass.callWS<CategoryRegistryEntry>({
    type: "config/category_registry/update",
    scope,
    category_id,
    ...updates,
  });

export const deleteCategoryRegistryEntry = (
  hass: HomeAssistant,
  scope: string,
  category_id: string
) =>
  hass.callWS({
    type: "config/category_registry/delete",
    scope,
    category_id,
  });
