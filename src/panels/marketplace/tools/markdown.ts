import type { RepositoryInfo } from "../../../data/marketplace/repository";

const showGitHubWeb = (text: string) =>
  text.toLowerCase().includes(".md") ||
  text.toLowerCase().includes(".markdown");

const rewriteLinks = (input: string, repository?: RepositoryInfo) => {
  // Handle conversion to raw GitHub URL
  input = input.replace(
    /https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^\s]+)/g,
    (x, owner, repo, path) => {
      return showGitHubWeb(x)
        ? x
        : `https://raw.githubusercontent.com/${owner}/${repo}/${path}`;
    }
  );

  // Handle relative links
  if (repository) {
    input = input.replace(/\[.*?\]\([^#](?!.*?:\/\/).*?\)/g, (x) => {
      const showWeb = showGitHubWeb(x);
      return x
        .replace("(/", "(")
        .replace(
          "(",
          `(${showWeb ? `https://github.com` : `https://raw.githubusercontent.com`}/${
            repository.full_name
          }${showWeb ? "/blob" : ""}/${repository.available_version || repository.default_branch}/`
        );
    });

    // Handle anchor references
    input = input.replace(/\[.*\]\(#.*\)/g, (x) => {
      return x.replace("(#", `(/marketplace/repository/${repository.id}#`);
    });

    // Add references to issues and PRs
    input = input.replace(
      /(?:\w[\w-.]+\/\w[\w-.]+|\B)#[1-9]\d*\b/g,
      (reference) => {
        const fullReference = reference.replace(
          /^#/,
          `${repository.full_name}#`
        );
        const [fullName, issue] = fullReference.split("#");
        return `[${reference}](https://github.com/${fullName}/issues/${issue})`;
      }
    );
  }
  return input;
};

// A backtick fence cannot have a backtick in its info string, a tilde fence can.
const FENCE_OPENING = /^ {0,3}(?:(`{3,})[^`]*|(~{3,}).*)$/;
const FENCE_CLOSING = /^ {0,3}(`{3,}|~{3,})\s*$/;
const CODE_PLACEHOLDER = /\0(\d+)\0/g;

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
const splitFencedCodeBlocks = (input: string) => {
  const blocks: MarkdownBlock[] = [];
  let current: MarkdownBlock | undefined;
  let fence: string | undefined;

  for (const line of input.split("\n")) {
    if (current?.code && fence) {
      current.lines.push(line);
      if (isClosingFence(line, fence)) {
        fence = undefined;
      }
      continue;
    }

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
  // Code is swapped for placeholders rather than split off, so links with code in their text still match.
  const code: string[] = [];
  const mask = (text: string) => {
    code.push(text);
    return `\0${code.length - 1}\0`;
  };

  const masked = splitFencedCodeBlocks(input)
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
