import type { RepositoryInfo } from "../../../data/marketplace/repository";

const showGitHubWeb = (text: string) =>
  text.toLowerCase().includes(".md") ||
  text.toLowerCase().includes(".markdown");

// A destination with a scheme of its own, like https: or mailto:, stays as is.
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;
// The destination of a link or an image, one at a time, so nested badges work.
const LINK_DESTINATION = /\]\(\s*([^\s)]+)([^)]*)\)/g;
const LINK = /!?\[[^[\]]*\]\([^)]*\)/g;
const BARE_URL = /[a-z][a-z\d+.-]*:\/\/\S+/gi;
const ISSUE_REFERENCE = /(?:\w[\w-.]+\/\w[\w-.]+|\B)#[1-9]\d*\b/g;
const LINK_PLACEHOLDER = /\uE000(\d+)\uE000/g;

const rawGitHubFiles = (input: string) =>
  input.replace(
    /https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^\s)]+)/g,
    (url, owner, repo, path) =>
      showGitHubWeb(url)
        ? url
        : `https://raw.githubusercontent.com/${owner}/${repo}/${path}`
  );

const repositoryDestination = (
  destination: string,
  repository: RepositoryInfo
) => {
  if (destination.startsWith("#")) {
    return `/marketplace/repository/${repository.id}${destination}`;
  }

  if (HAS_SCHEME.test(destination) || destination.startsWith("//")) {
    return destination;
  }

  // A downloaded repository shows the README of the downloaded version
  const ref =
    (repository.installed && repository.installed_version) ||
    repository.available_version ||
    repository.default_branch;
  const path = destination.replace(/^\//, "");

  return showGitHubWeb(path)
    ? `https://github.com/${repository.full_name}/blob/${ref}/${path}`
    : `https://raw.githubusercontent.com/${repository.full_name}/${ref}/${path}`;
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

const rewriteLinks = (input: string, repository?: RepositoryInfo) => {
  const output = rawGitHubFiles(input);
  if (!repository) {
    return output;
  }

  return linkIssueReferences(
    output.replace(
      LINK_DESTINATION,
      (_link, destination, title) =>
        `](${repositoryDestination(destination, repository)}${title})`
    ),
    repository
  );
};

// A backtick fence cannot have a backtick in its info string, a tilde fence can.
const FENCE_OPENING = /^ {0,3}(?:(`{3,})[^`]*|(~{3,}).*)$/;
const FENCE_CLOSING = /^ {0,3}(`{3,}|~{3,})\s*$/;
const CODE_PLACEHOLDER = /\0(\d+)\0/g;
const INDENTED_CODE = /^(?: {4}|\t)/;
const LIST_ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])\s/;

interface MarkdownBlock {
  code: boolean;
  lines: string[];
}

const isClosingFence = (line: string, fence: string) => {
  const closing = FENCE_CLOSING.exec(line);
  return (
    closing !== null &&
    closing[1][0] === fence[0] &&
    closing[1].length >= fence.length
  );
};

// An unclosed fence runs to the end of the document, like CommonMark.
const splitCodeBlocks = (input: string) => {
  const blocks: MarkdownBlock[] = [];
  let current: MarkdownBlock | undefined;
  let fence: string | undefined;

  let indented = false;
  let previousBlank = true;
  let inList = false;

  for (const line of input.split("\n")) {
    if (current?.code && fence) {
      current.lines.push(line);
      if (isClosingFence(line, fence)) {
        fence = undefined;
      }
      continue;
    }

    const blank = line.trim() === "";
    const indentation = INDENTED_CODE.test(line);

    // Indented lines in a list continue its item, they are not code
    if (LIST_ITEM.test(line)) {
      inList = true;
    } else if (!blank && !indentation) {
      inList = false;
    }

    // Indented code runs on over blank lines, until a line is not indented
    if (current?.code && indented && (blank || indentation)) {
      current.lines.push(line);
      previousBlank = blank;
      continue;
    }
    indented = false;

    // It can not interrupt a paragraph, a blank line comes before it
    if (indentation && previousBlank && !blank && !inList) {
      indented = true;
      current = { code: true, lines: [line] };
      blocks.push(current);
      previousBlank = false;
      continue;
    }
    previousBlank = blank;

    const opening = FENCE_OPENING.exec(line);
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
  let output = "";
  let position = 0;
  let index = 0;

  while (index < runs.length) {
    const opening = runs[index];
    const closingIndex = runs.findIndex(
      (run, runIndex) => runIndex > index && run[0].length === opening[0].length
    );

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

export const markdownWithRepositoryContext = (
  input: string,
  repository?: RepositoryInfo
) => {
  // The placeholders would be mistaken for content, a README never has them
  if (input.includes("\0") || input.includes("\uE000")) {
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

  return rewriteLinks(masked, repository).replace(
    CODE_PLACEHOLDER,
    (_placeholder, index) => code[Number(index)]
  );
};
