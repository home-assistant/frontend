import type { RepositoryInfo } from "../../../data/marketplace/repository";

const showGitHubWeb = (text: string) =>
  text.toLowerCase().includes(".md") ||
  text.toLowerCase().includes(".markdown");

// A destination with a scheme of its own, like https: or mailto:, stays as is.
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const GITHUB_FILE = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/;
// Each starts only where a link, a tag or an address can start, so a README
// with one long word or many unclosed tags is not searched over and over again
const LINK = /!?\[[^[\]]*\]\([^()]*\)/g;
const BARE_URL = /(?<![a-z\d+.-])[a-z][a-z\d+.-]*:\/\/\S+/gi;
// A tag or a numeric entity, like &#58;, holds no issue reference either
const HTML_TAG_OR_ENTITY = /<[a-z][^<>]*>|&#\d+;/gi;
const ISSUE_REFERENCE =
  /(?:(?<![\w.-])\w[\w.-]+\/\w[\w.-]+|(?<!\w))#[1-9]\d*\b/g;
const LINK_PLACEHOLDER = /\uE000(\d+)\uE000/g;

// A file shown on GitHub, the file itself comes from raw
const rawGitHubFile = (url: string) => {
  const file = GITHUB_FILE.exec(url);
  if (!file || showGitHubWeb(url)) {
    return url;
  }
  const [, owner, repo, path] = file;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${path}`;
};

/**
 * Return what the address of a link or an image in the README of a repository
 * points at, for ha-markdown to rewrite every address with.
 *
 * The README is at the root of the repository, relative addresses are too:
 * documents open on GitHub, everything else comes from raw.
 */
export const repositoryUrl =
  (repository?: RepositoryInfo) =>
  (url: string): string => {
    // A browser trims it, "https:" can follow a space
    const destination = rawGitHubFile(url.trim());

    // Headings get no ids, so an anchor has nothing to point at on this page
    if (
      !repository ||
      destination.startsWith("#") ||
      HAS_SCHEME.test(destination) ||
      destination.startsWith("//")
    ) {
      return destination;
    }

    // An installed repository shows the README of the installed version
    const ref =
      (repository.installed && repository.installed_version) ||
      repository.available_version ||
      repository.default_branch;
    // A leading slash is the root of the repository on GitHub, not of the host
    const path = destination.replace(/^\/+/, "");
    const base = showGitHubWeb(path)
      ? `https://github.com/${repository.full_name}/blob/${ref}/`
      : `https://raw.githubusercontent.com/${repository.full_name}/${ref}/`;

    return new URL(path, base).href;
  };

// Links and addresses are set aside, a reference inside one is not an issue.
const linkIssueReferences = (input: string, repository: RepositoryInfo) => {
  const setAside: string[] = [];
  const setAsideMatch = (match: string) => {
    setAside.push(match);
    return `\uE000${setAside.length - 1}\uE000`;
  };

  let masked = input;
  let previous: string;
  // A badge is a link around an image, so the inner one goes first
  do {
    previous = masked;
    masked = masked.replace(LINK, setAsideMatch);
  } while (masked !== previous);
  // Before the addresses, one in a tag would take the end of the tag with it
  masked = masked.replace(HTML_TAG_OR_ENTITY, setAsideMatch);
  masked = masked.replace(BARE_URL, setAsideMatch);

  let output = masked.replace(ISSUE_REFERENCE, (reference) => {
    const [fullName, issue] = reference
      .replace(/^#/, `${repository.full_name}#`)
      .split("#");
    return `[${reference}](https://github.com/${fullName}/issues/${issue})`;
  });

  do {
    previous = output;
    output = output.replace(
      LINK_PLACEHOLDER,
      (_placeholder, index) => setAside[Number(index)]
    );
  } while (output !== previous);

  return output;
};

// A backtick fence cannot have a backtick in its info string, a tilde fence can.
const FENCE_OPENING = /^ {0,3}(?:(`{3,})[^`]*|(~{3,}).*)$/;
const FENCE_CLOSING = /^ {0,3}(`{3,}|~{3,})\s*$/;
const CODE_PLACEHOLDER = /\0(\d+)\0/g;
const LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])( +|$)/;

interface MarkdownBlock {
  code: boolean;
  lines: string[];
}

// A tab moves on to the next multiple of four, like CommonMark.
const indentationWidth = (line: string) => {
  let width = 0;
  for (const character of line) {
    if (character === " ") {
      width += 1;
    } else if (character === "\t") {
      width += 4 - (width % 4);
    } else {
      break;
    }
  }
  return width;
};

// The column the text of a list item starts at, the marker and its spacing.
const listItemContent = (item: RegExpExecArray) => {
  const [, before, marker, after] = item;
  // More than four spaces after the marker start code, one of them belongs to it
  const spacing = after.length === 0 || after.length > 4 ? 1 : after.length;
  return before.length + marker.length + spacing;
};

const isClosingFence = (line: string, fence: string) => {
  const closing = FENCE_CLOSING.exec(line);
  return (
    closing !== null &&
    closing[1][0] === fence[0] &&
    closing[1].length >= fence.length
  );
};

// A quote holds markdown too, its markers are not part of what it holds
const QUOTE_MARKERS = /^(?: {0,3}> ?)+/;

// An unclosed fence runs to the end of the document, like CommonMark.
const splitCodeBlocks = (input: string) => {
  const blocks: MarkdownBlock[] = [];
  let current: MarkdownBlock | undefined;
  let fence: string | undefined;

  let indented = false;
  let previousBlank = true;
  // Where the text of the list item starts, its code is indented past that
  let listContent = 0;

  for (const line of input.split("\n")) {
    const content = line.replace(QUOTE_MARKERS, "");
    if (current?.code && fence) {
      current.lines.push(line);
      if (isClosingFence(content, fence)) {
        fence = undefined;
      }
      continue;
    }

    const blank = content.trim() === "";
    const width = blank ? 0 : indentationWidth(content);
    const indentation = !blank && width >= listContent + 4;

    const item = indentation ? null : LIST_ITEM.exec(content);
    if (item) {
      listContent = listItemContent(item);
    } else if (!blank && width < listContent) {
      listContent = 0;
    }

    // Indented code runs on over blank lines, until a line is not indented
    if (current?.code && indented && (blank || indentation)) {
      current.lines.push(line);
      previousBlank = blank;
      continue;
    }
    indented = false;

    // It can not interrupt a paragraph, a blank line comes before it
    if (indentation && previousBlank) {
      indented = true;
      current = { code: true, lines: [line] };
      blocks.push(current);
      previousBlank = false;
      continue;
    }
    previousBlank = blank;

    const opening = FENCE_OPENING.exec(content);
    if (opening) {
      fence = opening[1] ?? opening[2];
      current = { code: true, lines: [line] };
      blocks.push(current);
      continue;
    }

    if (!current || current.code) {
      current = { code: false, lines: [] };
      blocks.push(current);
    }
    current.lines.push(line);
  }

  return blocks;
};

// A code span closes at the next backtick run of the same length.
const maskInlineCodeSpans = (
  paragraph: string,
  mask: (code: string) => string
) => {
  const runs = [...paragraph.matchAll(/`+/g)];

  // The next run of the same length for every run, found in one pass from the
  // end, so a README full of backticks does not take ages
  const nextOfLength: number[] = new Array(runs.length).fill(-1);
  const latestOfLength = new Map<number, number>();
  for (let runIndex = runs.length - 1; runIndex >= 0; runIndex--) {
    const length = runs[runIndex][0].length;
    nextOfLength[runIndex] = latestOfLength.get(length) ?? -1;
    latestOfLength.set(length, runIndex);
  }

  let output = "";
  let position = 0;
  let index = 0;

  while (index < runs.length) {
    const opening = runs[index];
    const closingIndex = nextOfLength[index];

    if (closingIndex === -1) {
      index++;
      continue;
    }

    const closing = runs[closingIndex];
    const end = closing.index + closing[0].length;
    output +=
      paragraph.slice(position, opening.index) +
      mask(paragraph.slice(opening.index, end));
    position = end;
    index = closingIndex + 1;
  }

  return output + paragraph.slice(position);
};

// Code spans never cross a blank line, so a stray backtick stays in its paragraph.
const maskInlineCode = (text: string, mask: (code: string) => string) =>
  text
    .split(/(\n\s*\n)/)
    .map((paragraph) => maskInlineCodeSpans(paragraph, mask))
    .join("");

// Links issue references, like #12, to the repository. The addresses of links
// and images are rewritten by repositoryUrl, once the README is rendered.
export const markdownWithRepositoryContext = (
  input: string,
  repository?: RepositoryInfo
) => {
  // The placeholders would be mistaken for content, a README never has them
  if (!repository || input.includes("\0") || input.includes("\uE000")) {
    return input;
  }

  // Code is swapped for placeholders rather than split off, so links with code in their text still match.
  const code: string[] = [];
  const mask = (text: string) => {
    code.push(text);
    return `\0${code.length - 1}\0`;
  };

  const masked = splitCodeBlocks(input)
    .map((block) => {
      const text = block.lines.join("\n");
      return block.code ? mask(text) : maskInlineCode(text, mask);
    })
    .join("\n");

  return linkIssueReferences(masked, repository).replace(
    CODE_PLACEHOLDER,
    (_placeholder, index) => code[Number(index)]
  );
};
