import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

interface ImageEntityAttributes extends HassEntityAttributeBase {
  entity_picture: string;
}

export interface ImageEntity extends HassEntityBase {
  attributes: ImageEntityAttributes;
}

export const computeImageUrl = (entity: ImageEntity): string =>
  `${entity.attributes.entity_picture}${
    entity.attributes.entity_picture.includes("?") ? "&" : "?"
  }state=${entity.state}`;
