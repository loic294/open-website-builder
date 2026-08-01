import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { createGitRepositoryService } from "./git-repository-service.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  return await execFileAsync("git", args, { cwd });
}

async function setupRepository(t) {
  const root = await mkdtemp(resolve(tmpdir(), "owb-git-"));
  const remote = resolve(root, "origin.git");
  const seed = resolve(root, "seed");
  const local = resolve(root, "local");
  const other = resolve(root, "other");
  t.after(async () => await rm(root, { recursive: true, force: true }));

  await git(root, "init", "--bare", remote);
  await git(root, "init", "--initial-branch=main", seed);
  await git(seed, "config", "user.name", "OWB Test");
  await git(seed, "config", "user.email", "owb@example.test");
  await writeFile(resolve(seed, "content.txt"), "initial\n");
  await git(seed, "add", "--all");
  await git(seed, "commit", "--message", "Initial content");
  await git(seed, "remote", "add", "origin", remote);
  await git(seed, "push", "--set-upstream", "origin", "main");
  await git(remote, "symbolic-ref", "HEAD", "refs/heads/main");

  await git(root, "clone", remote, local);
  await git(root, "clone", remote, other);
  for (const directory of [local, other]) {
    await git(directory, "config", "user.name", "OWB Test");
    await git(directory, "config", "user.email", "owb@example.test");
  }

  return { local, other };
}

test("status fetches origin and reports behind commits", async (t) => {
  const { local, other } = await setupRepository(t);
  await writeFile(resolve(other, "remote.txt"), "remote\n");
  await git(other, "add", "--all");
  await git(other, "commit", "--message", "Remote change");
  await git(other, "push");

  const service = await createGitRepositoryService({ contentRoot: local });
  const status = await service.getStatus();

  assert.equal(status.branch, "main");
  assert.equal(status.behind, 1);
  assert.equal(status.ahead, 0);
  assert.equal(status.syncState, "behind");
});

test("pull preserves dirty and untracked files while applying remote commits", async (t) => {
  const { local, other } = await setupRepository(t);
  await writeFile(resolve(local, "content.txt"), "local edit\n");
  await writeFile(resolve(local, "draft.txt"), "draft\n");
  await writeFile(resolve(other, "remote.txt"), "remote\n");
  await git(other, "add", "--all");
  await git(other, "commit", "--message", "Remote change");
  await git(other, "push");

  const service = await createGitRepositoryService({ contentRoot: local });
  const status = await service.pull();

  assert.equal(
    await readFile(resolve(local, "content.txt"), "utf8"),
    "local edit\n",
  );
  assert.equal(await readFile(resolve(local, "draft.txt"), "utf8"), "draft\n");
  assert.equal(
    await readFile(resolve(local, "remote.txt"), "utf8"),
    "remote\n",
  );
  assert.equal(status.dirty, true);
  assert.equal(status.behind, 0);
});

test("pull preserves the stash and reports output when local changes conflict", async (t) => {
  const { local, other } = await setupRepository(t);
  await writeFile(resolve(local, "content.txt"), "local conflict\n");
  await writeFile(resolve(other, "content.txt"), "remote conflict\n");
  await git(other, "add", "--all");
  await git(other, "commit", "--message", "Conflicting remote change");
  await git(other, "push");

  const service = await createGitRepositoryService({ contentRoot: local });
  await assert.rejects(service.pull(), (error) => {
    assert.match(error.message, /could not be reapplied/i);
    assert.match(error.stderr, /preserved local changes remain/i);
    assert.match(error.command, /^git stash apply [0-9a-f]+$/);
    return true;
  });

  const conflicted = await readFile(resolve(local, "content.txt"), "utf8");
  const stashList = await git(local, "stash", "list");
  assert.match(conflicted, /<<<<<<< Updated upstream/);
  assert.match(stashList.stdout, /OWB pull/);
});

test("commit and push stages all files with a timestamped commit", async (t) => {
  const { local, other } = await setupRepository(t);
  await writeFile(resolve(local, "content.txt"), "updated\n");
  await writeFile(resolve(local, "new.txt"), "new\n");

  const service = await createGitRepositoryService({ contentRoot: local });
  const status = await service.commitAndPush();
  await git(other, "pull", "--ff-only");
  const log = await git(local, "log", "-1", "--pretty=%s");

  assert.match(log.stdout, /^Update website content \d{4}-\d{2}-\d{2}/);
  assert.equal(await readFile(resolve(other, "new.txt"), "utf8"), "new\n");
  assert.equal(status.dirty, false);
  assert.equal(status.ahead, 0);
});
