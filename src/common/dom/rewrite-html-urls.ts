// The attributes that hold the address of a link or an image
const URL_ATTRIBUTES = [
  ["a", "href"],
  ["img", "src"],
  ["source", "src"],
] as const;

// The markdown worker drops a srcset unless every part between commas and
// spaces is a safe URL or a descriptor, so a plain split is enough: the srcset
// is written back from the rewritten URLs.
const splitSrcsetCandidates = (srcset: string) =>
  srcset
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/))
    .filter(([url]) => url);

const rewriteSrcset = (srcset: string, rewrite: (url: string) => string) =>
  splitSrcsetCandidates(srcset)
    .map(([url, ...descriptors]) => [rewrite(url), ...descriptors].join(" "))
    .join(", ");

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

  // Rewrite each address in a <picture> source like an image
  for (const element of template.content.querySelectorAll("source[srcset]")) {
    element.setAttribute(
      "srcset",
      rewriteSrcset(element.getAttribute("srcset")!, rewrite)
    );
  }

  return template.innerHTML;
};
