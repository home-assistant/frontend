import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

interface ImageEntityAttributes extends HassEntityAttributeBase {
  access_token: string;
}

export interface ImageEntity extends HassEntityBase {
  attributes: ImageEntityAttributes;
}

export const computeImageUrl = (entity: ImageEntity): string =>
  `/api/image_proxy/${entity.entity_id}?token=${entity.attributes.access_token}&state=${entity.state}`;
