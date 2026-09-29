/** Do not measure undefined card tags or Lit elements with a pending render. */
export function waitForSectionRender(
  sections: readonly HTMLElement[],
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    let stopped = false;
    const finish = () => {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    // Broken custom cards must not prevent the view from becoming usable.
    const timeout = window.setTimeout(finish, 2000);
    signal.addEventListener("abort", finish, { once: true });

    const collect = () => {
      const elements: Element[] = [];
      const visit = (element: Element) => {
        elements.push(element);
        for (const child of element.children) visit(child);
        if (element.shadowRoot) {
          for (const child of element.shadowRoot.children) visit(child);
        }
      };
      sections.filter((section) => !section.hidden).forEach(visit);
      return elements;
    };
    const waitForElement = async (element: Element) => {
      if (
        element.localName.includes("-") &&
        !customElements.get(element.localName)
      ) {
        await customElements.whenDefined(element.localName);
      }
      if (!stopped && "updateComplete" in element) {
        await element.updateComplete;
      }
    };
    const settle = async (elements = collect()): Promise<void> => {
      if (stopped) return;
      await Promise.all(elements.map(waitForElement));
      if (stopped) return;
      const current = collect();
      if (
        current.length === elements.length &&
        current.every((element, index) => element === elements[index]) &&
        current.every(
          (element) =>
            !("isUpdatePending" in element && element.isUpdatePending)
        )
      ) {
        await document.fonts?.ready;
        return;
      }
      // Let rendering and the timeout advance even if a card keeps updating.
      await new Promise<void>((done) => {
        window.setTimeout(done, 0);
      });
      await settle(current);
    };
    void settle().then(finish, finish);
  });
}
