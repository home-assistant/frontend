// The attributes that hold the address of a link or an image
const URL_ATTRIBUTES = [
  ["a", "href"],
  ["img", "src"],
] as const;

/**
 * Rewrite the address of every link and image in a piece of HTML.
 *
 * Parsed in a template, which loads nothing, so an image with a relative
 * address is never requested from Home Assistant before it is rewritten. The
 * browser already resolved entities and every way markdown writes a link.
 */
export const rewriteHtmlUrls = (
  html: string,
  rewrite: (url: string) => string
): string => {
  const template = document.createElement("template");
  template.innerHTML = html;

  for (const [tag, attribute] of URL_ATTRIBUTES) {
    for (const element of template.content.querySelectorAll(
      `${tag}[${attribute}]`
    )) {
      element.setAttribute(
        attribute,
        rewrite(element.getAttribute(attribute)!)
      );
    }
  }

  return template.innerHTML;
};
