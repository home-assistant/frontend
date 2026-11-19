import type { HaFormSchema } from "../../../../components/ha-form/types";
import { ENERGY_COLLECTION_KEY_PREFIX } from "../../../../data/energy";

interface CollectionKeyConfig {
  collection_key?: string;
}

export const energyCollectionKeySchema = {
  name: "collection_key",
  required: false,
  selector: { text: { prefix: ENERGY_COLLECTION_KEY_PREFIX } },
} as const satisfies HaFormSchema;

export const collectionKeyToFormData = <T extends CollectionKeyConfig>(
  config: T
): T =>
  config.collection_key?.startsWith(ENERGY_COLLECTION_KEY_PREFIX)
    ? {
        ...config,
        collection_key: config.collection_key.slice(
          ENERGY_COLLECTION_KEY_PREFIX.length
        ),
      }
    : config;

export const collectionKeyFromFormData = <T extends CollectionKeyConfig>(
  data: T
): T => {
  if (typeof data.collection_key === "string") {
    return {
      ...data,
      collection_key: ENERGY_COLLECTION_KEY_PREFIX + data.collection_key,
    };
  }
  if ("collection_key" in data) {
    const { collection_key: _collectionKey, ...rest } = data;
    return rest as T;
  }
  return data;
};
