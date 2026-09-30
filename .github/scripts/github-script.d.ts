// The arguments actions/github-script passes to the scripts in this directory,
// limited to the parts they use.
import type { Octokit } from "@octokit/rest";

export interface Summary {
  addHeading(text: string, level?: number): Summary;
  addRaw(text: string): Summary;
  write(): Promise<Summary>;
}

export interface Core {
  info(message: string): void;
  setFailed(message: string): void;
  summary: Summary;
}

export interface User {
  login: string;
  type: string;
}

export interface PullRequestPayload {
  pull_request: {
    number: number;
    body: string | null;
    draft: boolean;
    user: User;
    labels: { name: string }[];
  };
}

export interface IssuePayload {
  issue: {
    user: User;
  };
}

export interface Context<Payload> {
  repo: { owner: string; repo: string };
  issue: { owner: string; repo: string; number: number };
  payload: Payload;
}

export interface GitHubScriptArgs<Payload> {
  github: Octokit;
  context: Context<Payload>;
  core: Core;
}
