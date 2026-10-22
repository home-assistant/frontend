// The attributes that hold the address of a link or an image
const URL_ATTRIBUTES = [
  ["a", "href"],
  ["img", "src"],
  ["source", "src"],
] as const;

interface SrcsetCandidate {
  url: string;
  descriptors: string[];
}

const isSpace = (character: string) =>
  character === " " ||
  character === "\t" ||
  character === "\n" ||
  character === "\f" ||
  character === "\r";

// Split a srcset into its candidates the way the browser does, one character
// at a time: a URL, then descriptors like `2x` up to the next comma.
// https://html.spec.whatwg.org/multipage/images.html#parsing-a-srcset-attribute
const parseSrcset = (srcset: string): SrcsetCandidate[] => {
  const candidates: SrcsetCandidate[] = [];
  let position = 0;

  while (position < srcset.length) {
    if (isSpace(srcset[position]) || srcset[position] === ",") {
      position++;
      continue;
    }

    const start = position;
    while (position < srcset.length && !isSpace(srcset[position])) {
      position++;
    }
    let end = position;
    const descriptors: string[] = [];

    if (srcset[end - 1] === ",") {
      // Commas right after the URL end the candidate: it has no descriptors
      while (srcset[end - 1] === ",") {
        end--;
      }
    } else {
      let descriptor = "";
      let inParentheses = false;
      for (; position < srcset.length; position++) {
        const character = srcset[position];
        if (inParentheses) {
          inParentheses = character !== ")";
        } else if (isSpace(character)) {
          if (descriptor) {
            descriptors.push(descriptor);
          }
          descriptor = "";
          continue;
        } else if (character === ",") {
          position++;
          break;
        } else {
          inParentheses = character === "(";
        }
        descriptor += character;
      }
      if (descriptor) {
        descriptors.push(descriptor);
      }
    }

    candidates.push({ url: srcset.slice(start, end), descriptors });
  }

  return candidates;
};

const serializeSrcset = (candidates: SrcsetCandidate[]) =>
  candidates
    .map(({ url, descriptors }) => [url, ...descriptors].join(" "))
    .join(", ");

// Rewrite the URL of every candidate and keep its descriptors. Returns
// undefined when the browser would not read the result back the same way, like
// a rewritten URL with a space in it, so no candidate is left unrewritten.
const rewriteSrcset = (
  srcset: string,
  rewrite: (url: string) => string
): string | undefined => {
  const candidates = parseSrcset(srcset).map(({ url, descriptors }) => ({
    url: rewrite(url),
    descriptors,
  }));
  const output = serializeSrcset(candidates);
  const read = parseSrcset(output);
  return read.length === candidates.length &&
    read.every(
      ({ url, descriptors }, index) =>
        url === candidates[index].url &&
        descriptors.join(" ") === candidates[index].descriptors.join(" ")
    )
    ? output
    : undefined;
};

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

  // Rewrite each address in a <picture> source like an image. If one can't be,
  // drop the whole srcset so the <img> fallback is shown instead.
  for (const element of template.content.querySelectorAll("source[srcset]")) {
    const srcset = rewriteSrcset(element.getAttribute("srcset")!, rewrite);
    if (srcset === undefined) {
      element.removeAttribute("srcset");
    } else {
      element.setAttribute("srcset", srcset);
    }
  }

  return template.innerHTML;
};
