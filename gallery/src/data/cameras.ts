import { getEntity } from "../../../src/fake_data/entity";

export const createCameraEntities = () => [
  getEntity("camera", "kitchen", "idle", {
    friendly_name: "Kitchen",
    supported_features: 4,
    motion_detection: false,
    entity_picture: "/images/kitchen.png",
  }),
  getEntity("camera", "living_room", "idle", {
    friendly_name: "Living Room",
    supported_features: 4,
    motion_detection: true,
    entity_picture: "/images/living_room.png",
  }),
  getEntity("camera", "office", "idle", {
    friendly_name: "Office (no motion)",
    supported_features: 0,
    entity_picture: "/images/office.jpg",
  }),
];
