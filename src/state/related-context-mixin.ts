import { consume } from "@lit/context";
import type { LitElement } from "lit";
import { state } from "lit/decorators";
import type { RelatedIdSets } from "../common/search/related-context";
import { relatedContext } from "../data/context";
import type { Constructor } from "../types";

export const RelatedContextMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class RelatedContextClass extends superClass {
    @consume({ context: relatedContext, subscribe: true })
    @state()
    protected relatedIdSets?: RelatedIdSets;
  }
  return RelatedContextClass;
};
