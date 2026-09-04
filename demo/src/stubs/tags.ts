import type { Tag, UpdateTagParams } from "../../../src/data/tag";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockTags = (hass: MockHomeAssistant) => {
  // The panel offers add, edit and delete, so the mock keeps the tags rather
  // than answering from a constant, and hands back copies the way a real
  // response would.
  const tags: Tag[] = [{ id: "my-tag", name: "My Tag" }];
  let created = 0;

  const find = (tagId: string) => tags.find((tag) => tag.id === tagId);

  hass.mockWS("tag/list", () => tags.map((tag) => ({ ...tag })));

  hass.mockWS(
    "tag/create",
    (msg: UpdateTagParams & { tag_id?: string }): Tag => {
      // The dialog lets the user pick the ID, and the backend's tag collection
      // refuses one that is taken.
      if (msg.tag_id && find(msg.tag_id)) {
        throw new Error(`Tag ${msg.tag_id} already exists`);
      }
      let id = msg.tag_id;
      while (!id) {
        created += 1;
        id = find(`tag-${created}`) ? undefined : `tag-${created}`;
      }
      const tag: Tag = {
        id,
        name: msg.name,
        description: msg.description,
      };
      tags.push(tag);
      return { ...tag };
    }
  );

  hass.mockWS(
    "tag/update",
    (msg: UpdateTagParams & { tag_id: string }): Tag => {
      const tag = find(msg.tag_id);
      if (!tag) {
        throw new Error(`Tag ${msg.tag_id} not found`);
      }
      // The params are partial, and the backend merges them, so an update that
      // sends only a name must not drop the description.
      if ("name" in msg) {
        tag.name = msg.name;
      }
      if ("description" in msg) {
        tag.description = msg.description;
      }
      return { ...tag };
    }
  );

  hass.mockWS("tag/delete", (msg: { tag_id: string }) => {
    const index = tags.findIndex((tag) => tag.id === msg.tag_id);
    if (index === -1) {
      throw new Error(`Tag ${msg.tag_id} not found`);
    }
    tags.splice(index, 1);
    return undefined;
  });
};
