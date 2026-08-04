import { spawn } from "node:child_process";
import { delimiter, dirname, resolve } from "node:path";

export class GitCommandError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "GitCommandError";
    Object.assign(this, details);
  }
}

function displayCommand(args) {
  return ["git", ...args]
    .map((value) =>
      /^[a-zA-Z0-9_./:@{}=-]+$/.test(value) ? value : JSON.stringify(value),
    )
    .join(" ");
}

export function buildGitCommandEnvironment(
  cwd,
  environment = process.env,
  nodeExecutable = process.execPath,
) {
  const executablePaths = [
    resolve(cwd, "node_modules/.bin"),
    dirname(nodeExecutable),
    environment.PATH,
  ].filter(Boolean);
  return {
    ...environment,
    PATH: executablePaths.join(delimiter),
    GIT_TERMINAL_PROMPT: "0",
  };
}

function runGit(cwd, args, { allowedExitCodes = [0] } = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn("git", args, {
      cwd,
      env: buildGitCommandEnvironment(cwd),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      rejectCommand(
        new GitCommandError(error.message, {
          command: displayCommand(args),
          stdout,
          stderr,
          exitCode: null,
        }),
      );
    });
    child.on("close", (exitCode) => {
      const result = {
        command: displayCommand(args),
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      };
      if (!allowedExitCodes.includes(exitCode)) {
        rejectCommand(
          new GitCommandError(
            result.stderr ||
              result.stdout ||
              `Git exited with code ${exitCode}`,
            result,
          ),
        );
        return;
      }
      resolveCommand(result);
    });
  });
}

function parseStatus(output) {
  const lines = output.split("\n").filter(Boolean);
  const branchLine = lines.find((line) => line.startsWith("# branch.head "));
  const upstreamLine = lines.find((line) =>
    line.startsWith("# branch.upstream "),
  );
  const aheadBehindLine = lines.find((line) => line.startsWith("# branch.ab "));
  const changedFiles = lines.filter((line) => !line.startsWith("#")).length;
  const aheadBehind = aheadBehindLine?.match(/\+(\d+)\s+-(\d+)/);
  const ahead = Number(aheadBehind?.[1] || 0);
  const behind = Number(aheadBehind?.[2] || 0);

  let syncState = changedFiles ? "dirty" : "clean";
  if (!upstreamLine) syncState = "no-upstream";
  else if (ahead && behind) syncState = "diverged";
  else if (behind) syncState = "behind";
  else if (ahead) syncState = "ahead";

  return {
    available: true,
    branch: branchLine?.slice("# branch.head ".length) || "HEAD",
    upstream: upstreamLine?.slice("# branch.upstream ".length) || "",
    ahead,
    behind,
    dirty: changedFiles > 0,
    changedFiles,
    syncState,
    checkedAt: new Date().toISOString(),
  };
}

export async function createGitRepositoryService({ contentRoot }) {
  const requestedRoot = resolve(contentRoot);
  const rootResult = await runGit(requestedRoot, [
    "rev-parse",
    "--show-toplevel",
  ]);
  const repositoryRoot = resolve(rootResult.stdout);
  let operationQueue = Promise.resolve();

  function serialize(operation) {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.catch(() => {});
    return result;
  }

  async function getStatus({ fetch = true } = {}) {
    const upstream = await runGit(
      repositoryRoot,
      ["rev-parse", "--abbrev-ref", "@{upstream}"],
      { allowedExitCodes: [0, 128] },
    );
    if (fetch && upstream.exitCode === 0) {
      await runGit(repositoryRoot, ["fetch", "--prune"]);
    }
    const status = await runGit(repositoryRoot, [
      "status",
      "--porcelain=v2",
      "--branch",
    ]);
    return parseStatus(status.stdout);
  }

  async function createStash() {
    await runGit(repositoryRoot, [
      "stash",
      "push",
      "--include-untracked",
      "--message",
      `OWB pull ${new Date().toISOString()}`,
    ]);
    const stash = await runGit(repositoryRoot, [
      "stash",
      "list",
      "--max-count=1",
      "--format=%gd%x00%H",
    ]);
    const [reference, oid] = stash.stdout.split("\0");
    if (!reference || !oid) {
      throw new GitCommandError("Git did not create the expected OWB stash.");
    }
    return { reference, oid };
  }

  async function restoreStash(stash) {
    if (!stash) return;
    try {
      await runGit(repositoryRoot, ["stash", "apply", stash.oid]);
      await runGit(repositoryRoot, ["stash", "drop", stash.reference]);
    } catch (error) {
      throw new GitCommandError(
        `Local changes could not be reapplied automatically. Resolve the conflicts, then drop ${stash.reference} when it is no longer needed.`,
        {
          command: error.command,
          stdout: error.stdout,
          stderr: [
            error.stderr,
            `The preserved local changes remain in ${stash.reference} (${stash.oid}).`,
          ]
            .filter(Boolean)
            .join("\n"),
          exitCode: error.exitCode,
        },
      );
    }
  }

  async function assertAuthorIdentity() {
    const [userName, userEmail] = await Promise.all([
      runGit(repositoryRoot, ["config", "--get", "user.name"], {
        allowedExitCodes: [0, 1],
      }),
      runGit(repositoryRoot, ["config", "--get", "user.email"], {
        allowedExitCodes: [0, 1],
      }),
    ]);
    if (!userName.stdout || !userEmail.stdout) {
      throw new GitCommandError(
        "Git author identity is not configured. Set user.name and user.email before committing.",
      );
    }
  }

  return {
    repositoryRoot,
    getStatus: (options) => serialize(() => getStatus(options)),
    pull: () =>
      serialize(async () => {
        const before = await getStatus({ fetch: true });
        if (!before.upstream) {
          throw new GitCommandError(
            "The current branch has no upstream branch.",
          );
        }

        let stash = null;
        if (before.dirty) {
          stash = await createStash();
        }

        try {
          await runGit(repositoryRoot, ["pull"]);
        } catch (error) {
          try {
            await restoreStash(stash);
          } catch (restoreError) {
            error.stderr = [
              error.stderr,
              "The pull failed and local changes also need manual recovery:",
              restoreError.stderr || restoreError.message,
            ]
              .filter(Boolean)
              .join("\n");
          }
          throw error;
        }

        await restoreStash(stash);
        return await getStatus({ fetch: false });
      }),
    commit: ({ message, paths }) =>
      serialize(async () => {
        if (typeof message !== "string" || !message.trim()) {
          throw new GitCommandError("A commit message is required.");
        }
        if (!Array.isArray(paths) || paths.length === 0) {
          throw new GitCommandError("At least one commit path is required.");
        }

        await runGit(repositoryRoot, ["add", "--", ...paths]);
        const staged = await runGit(
          repositoryRoot,
          ["diff", "--cached", "--quiet", "--", ...paths],
          { allowedExitCodes: [0, 1] },
        );
        if (staged.exitCode === 1) {
          await assertAuthorIdentity();
          await runGit(repositoryRoot, [
            "commit",
            "--only",
            "--message",
            message,
            "--",
            ...paths,
          ]);
        }
        return await getStatus({ fetch: false });
      }),
    commitAndPush: () =>
      serialize(async () => {
        const before = await getStatus({ fetch: true });
        if (!before.upstream) {
          throw new GitCommandError(
            "The current branch has no upstream branch.",
          );
        }

        if (before.dirty) {
          await assertAuthorIdentity();
        }

        await runGit(repositoryRoot, ["add", "--all"]);
        const staged = await runGit(
          repositoryRoot,
          ["diff", "--cached", "--quiet"],
          { allowedExitCodes: [0, 1] },
        );
        if (staged.exitCode === 1) {
          const timestamp = new Date()
            .toISOString()
            .replace("T", " ")
            .replace(/\.\d{3}Z$/, " UTC");
          await runGit(repositoryRoot, [
            "commit",
            "--message",
            `Update website content ${timestamp}`,
          ]);
        }
        try {
          await runGit(repositoryRoot, ["push"]);
        } catch (error) {
          throw new GitCommandError(
            "Push failed. Any commit created by OWB remains safely in the local repository.",
            {
              command: error.command,
              stdout: error.stdout,
              stderr: error.stderr,
              exitCode: error.exitCode,
            },
          );
        }
        return await getStatus({ fetch: false });
      }),
  };
}
