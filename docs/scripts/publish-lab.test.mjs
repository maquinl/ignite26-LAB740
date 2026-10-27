import assert from "node:assert/strict";
import { watch } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { setTimeout } from "node:timers/promises";
import { generatedDirectory, getSiteBase, heroFile, homeFile, prepareSite, publishMarkdown, sourceFile } from "./publish-lab.mjs";

test("supports project paths and root hosting, including an empty deployment base path", () => {
  for (const [input, expected] of [
    [undefined, "/ignite26-LAB740/"],
    ["", "/"],
    ["/", "/"],
    ["/ignite26-LAB740", "/ignite26-LAB740/"],
    ["/ignite26-LAB740/", "/ignite26-LAB740/"],
    ["/workshop", "/workshop/"],
  ]) {
    assert.equal(getSiteBase(input), expected);
  }
});

test("rejects a domain or relative path as the deployment base path", () => {
  for (const input of ["https://example.com", "//example.com", "ignite26-LAB740"]) {
    assert.throws(() => getSiteBase(input), /PAGES_BASE_PATH/);
  }
});

test("converts the lab's Copilot link into a normal Markdown link", () => {
  const { markdown } = publishMarkdown("Open +++https://m365.cloud.microsoft/chat+++");
  assert.equal(markdown, "Open [https://m365.cloud.microsoft/chat](https://m365.cloud.microsoft/chat)");
});

test("removes the dependency on the Lab00 account table", () => {
  const { markdown } = publishMarkdown(
    "Check the account you selected from the [workshop account table in Lab 00](Lab00.md#choose-and-sign-in-with-a-workshop-account).",
  );
  assert.equal(markdown, "Check the account you are using.");
});

test("removes Skillable step checkboxes while preserving numbering, indentation, and line endings", () => {
  const source = [
    "1. [ ] First step.",
    "2. [ ] Second step.",
    "",
    "   Additional details.",
    "   1. [ ] Nested step.",
    "10. [ ] Last step, with [ ] in its text.",
    "Keep [ ] in ordinary text.",
  ].join("\r\n");
  const { markdown } = publishMarkdown(source);
  assert.equal(markdown, [
    "1. First step.",
    "2. Second step.",
    "",
    "   Additional details.",
    "   1. Nested step.",
    "10. Last step, with [ ] in its text.",
    "Keep [ ] in ordinary text.",
  ].join("\r\n"));
});

test("converts Skillable hints into website tips while preserving text, indentation, and line endings", () => {
  const text = "Use the code box's **Copy** button.";
  for (const newline of ["\n", "\r\n"]) {
    const expected = [
      "1. Copy the prompt.",
      "",
      "   > [!TIP]",
      `   > ${text}`,
    ].join(newline);
    for (const hint of [
      [`   > [!Hint] ${text}`],
      ["   > [!Hint]", `   > ${text}`],
    ]) {
      const source = ["1. [ ] Copy the prompt.", "", ...hint].join(newline);
      assert.equal(publishMarkdown(source).markdown, expected);
    }
  }
});

test("preserves checkbox and hint examples inside fenced prompt and code blocks", () => {
  for (const delimiter of ["```", "~~~"]) {
    const prompt = [
      `   ${delimiter}text`,
      "1. [ ] Keep this prompt step.",
      delimiter[0].repeat(2),
      "2. [ ] This shorter marker does not close the block.",
      delimiter === "```" ? "~~~" : "```",
      "3. [ ] A different marker does not close it either.",
      "> [!Hint] Keep this literal hint example.",
      `   ${delimiter}${delimiter[0]}`,
    ].join("\n");
    const { markdown } = publishMarkdown(`1. [ ] Before.\n\n${prompt}\n\n1. [ ] After.`);
    assert.equal(markdown, `1. Before.\n\n${prompt}\n\n1. After.`);
  }
});

test("publishes only referenced screenshots and deduplicates repeated images", () => {
  const { markdown, images } = publishMarkdown(
    "![First](../instructions/media/agent.jpg)\n![Again](../instructions/media/agent.jpg)",
  );
  assert.deepEqual(images, ["agent.jpg"]);
  assert.equal(markdown, "![First](./media/agent.jpg)\n![Again](./media/agent.jpg)");
});

test("rejects images outside the screenshot directory", () => {
  for (const image of [
    "../Lab00.md",
    "../instructions/media/../private.jpg",
    "../instructions/media/..\\private.jpg",
    "../instructions/media//private.jpg",
  ]) {
    assert.throws(() => publishMarkdown(`![Image](${image})`), /Screenshot|Invalid screenshot/);
  }
});

test("rejects unhandled lab links and credential tokens", () => {
  for (const source of [
    "[Setup](Lab00.md)",
    "+++@lab.Variable(TAP)+++",
    "@lab.CloudCredential(WWLM365E7).UserPassword",
  ]) {
    assert.throws(() => publishMarkdown(source), /lab-only reference/);
  }
});

test("preserves every prompt and all nine workshop steps from the actual source", async () => {
  const source = await readFile(sourceFile, "utf8");
  const { markdown, images } = publishMarkdown(source);
  const prompts = (text) => text.match(/^[ \t]*```text\r?\n[\s\S]*?^[ \t]*```/gm);
  assert.deepEqual(prompts(markdown), prompts(source));
  const steps = (text) => [...text.matchAll(/^## Step (\d+):/gm)].map((match) => Number(match[1]));
  assert.deepEqual(steps(markdown), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(images.length > 0);
  assert.doesNotMatch(markdown, /Lab00\.md|@lab\.|\+\+\+/);
  assert.doesNotMatch(markdown, /^\d+\.[ \t]+\[ \]/m);
});

test("generates separate home and workshop pages without modifying the Skillable source", async () => {
  const source = await readFile(sourceFile);
  await prepareSite({ clean: true });
  assert.equal(
    await readFile(path.join(generatedDirectory, "index.md"), "utf8"),
    await readFile(homeFile, "utf8"),
  );
  assert.equal(
    await readFile(path.join(generatedDirectory, "workshop.md"), "utf8"),
    publishMarkdown(source.toString("utf8")).markdown,
  );
  assert.deepEqual(
    await readFile(path.join(generatedDirectory, "public", "copilot.png")),
    await readFile(heroFile),
  );
  assert.deepEqual(await readFile(sourceFile), source);
});

test("refreshes pages without deleting them or rewriting unchanged images", async () => {
  const images = await prepareSite({ clean: true });
  const screenshot = path.join(generatedDirectory, "media", ...images[0].split("/"));
  const before = await stat(screenshot);
  const hero = path.join(generatedDirectory, "public", "copilot.png");
  const heroBefore = await stat(hero);
  const events = [];
  const watcher = watch(generatedDirectory, (type, filename) => {
    events.push({ type, filename: filename?.toString() });
  });
  try {
    await prepareSite();
    await setTimeout(100);
  } finally {
    watcher.close();
  }
  assert.ok(!events.some(({ type, filename }) => type === "rename" && ["index.md", "workshop.md"].includes(filename)));
  assert.equal((await stat(screenshot)).mtimeMs, before.mtimeMs);
  assert.equal((await stat(hero)).mtimeMs, heroBefore.mtimeMs);
});

test("a clean build removes stale generated pages", async () => {
  await writeFile(path.join(generatedDirectory, "stale-fixture.md"), "Not part of Lab01.");
  await prepareSite({ clean: true });
  assert.deepEqual((await readdir(generatedDirectory)).sort(), ["index.md", "media", "public", "workshop.md"]);
});
