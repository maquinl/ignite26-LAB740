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

test("converts lowercase Skillable notes without changing GitHub alert titles", () => {
  for (const newline of ["\n", "\r\n"]) {
    const source = [
      "1. [ ] Copy the prompt.",
      "",
      "    > [!note] Keep the **original** context.",
      "",
      "> [!NOTE] Remember",
      "> Keep this alert title.",
    ].join(newline);
    const expected = [
      "1. Copy the prompt.",
      "",
      "    > [!NOTE]",
      "    > Keep the **original** context.",
      "",
      "> [!NOTE] Remember",
      "> Keep this alert title.",
    ].join(newline);
    assert.equal(publishMarkdown(source).markdown, expected);
  }
});

test("preserves continuation paragraphs within task-scoped Skillable callouts", () => {
  for (const newline of ["\n", "\r\n"]) {
    for (const [sourceType, publishedType] of [["note", "NOTE"], ["hint", "TIP"]]) {
      const source = [
        "1. [ ] Add knowledge.",
        "",
        `    > [!${sourceType}] First paragraph.`,
        "    >",
        "    >**If you get stuck:** Keep this advice in the same callout.",
      ].join(newline);
      const expected = [
        "1. Add knowledge.",
        "",
        `    > [!${publishedType}]`,
        "    > First paragraph.",
        "    >",
        "    >**If you get stuck:** Keep this advice in the same callout.",
      ].join(newline);
      assert.equal(publishMarkdown(source).markdown, expected);
    }
  }
});

test("uses verified Skillable syntax for both opening task callouts", async () => {
  const source = await readFile(sourceFile, "utf8");
  assert.match(source, /^ {4}> \[!note\] Running this prompt uses[^\r\n]+$/m);
  assert.match(source, /^ {4}> \[!hint\] For long prompts like this one,[^\r\n]+$/m);
  const { markdown } = publishMarkdown(source);
  assert.match(markdown, /^ {4}> \[!NOTE\]\r?\n {4}> Running this prompt uses[^\r\n]+$/m);
  assert.match(markdown, /^ {4}> \[!TIP\]\r?\n {4}> For long prompts like this one,[^\r\n]+$/m);
});

test("uses consistent inline callouts and correct task or section indentation throughout the lab", async () => {
  const source = await readFile(sourceFile, "utf8");
  const directives = [...source.matchAll(/^[ \t]*>[ \t]*\[![^\]]+\][^\r\n]*$/gm)];
  const callouts = [...source.matchAll(/^([ \t]*)> \[!(note|hint)\] ([^\r\n]+)$/gm)];
  assert.ok(callouts.length > 0);
  assert.equal(callouts.length, directives.length);
  const taskCallouts = [
    "Running this prompt uses",
    "For long prompts like this one,",
    "**Check:** Your Human Persona document contains",
    "**If you get stuck:** If Copilot cannot access",
    "When you repeat this workshop",
    "If you saved the Word document locally,",
    "**Check:** Your Human Persona document appears",
    "The **NestorW** workshop account has pre-populated",
    "**Check:** **Cloud Files**, **Outlook**, and **Teams** are on.",
  ];
  for (const [, indentation, , text] of callouts) {
    const inTask = taskCallouts.some((prefix) => text.startsWith(prefix));
    assert.equal(indentation, inTask ? "    " : "", `Incorrect callout indentation: ${text}`);
  }
  const { markdown } = publishMarkdown(source);
  const published = [...markdown.matchAll(/^([ \t]*)> \[!(NOTE|TIP)\]\r?\n\1> ([^\r\n]+)$/gm)];
  assert.deepEqual(
    published.map(([, indentation, type, text]) => [indentation, type, text]),
    callouts.map(([, indentation, type, text]) => [
      indentation, type === "note" ? "NOTE" : "TIP", text,
    ]),
  );
});

test("removes standalone Skillable page breaks while preserving other equals signs and line endings", () => {
  for (const newline of ["\n", "\r\n"]) {
    const source = [
      "Introduction.",
      "",
      "===",
      "",
      "## Step 1: First",
      "",
      "=== \t",
      "",
      "## Step 2: Second",
      "",
      "Keep === in text.",
      "`===`",
      "====",
      "    ===",
    ].join(newline);
    const { markdown } = publishMarkdown(source);
    assert.equal(markdown, [
      "Introduction.",
      "",
      "",
      "",
      "## Step 1: First",
      "",
      "",
      "",
      "## Step 2: Second",
      "",
      "Keep === in text.",
      "`===`",
      "====",
      "    ===",
    ].join(newline));
  }
});

test("publishes Skillable suggested prompt rows as headings and full-width code blocks", () => {
  const entries = [
    { title: "The morning briefing", prompt: "Hey Atlas, review my calendar and emails." },
    { title: "Meeting prep", prompt: "Help with [topic], **literal** formatting, and C++." },
    {
      title: "Weekly | reflection",
      prompt: "Compare stop | start | continue. Keep ``` intact.",
      codeFence: "````",
    },
  ];
  for (const newline of ["\n", "\r\n"]) {
    const table = [
      "| Title | Prompt |",
      "| --- | --- |",
      ...entries.map(({ title, prompt }) =>
        `| +++${title.replace(/\|/g, "\\|")}+++ | ++${prompt.replace(/\|/g, "\\|")}++ |`,
      ),
    ].join(newline);
    const expected = entries.map(({ title, prompt, codeFence = "```" }) =>
      [`### ${title}`, "", `${codeFence}text`, prompt, codeFence].join(newline),
    ).join(newline + newline);
    assert.equal(publishMarkdown(table).markdown, expected);
  }
});

test("leaves ordinary Markdown tables unchanged", () => {
  for (const table of [
    "| Title | Prompt |\n| --- | --- |\n| Example | Plain prompt text. |",
    "| Issue | Fix |\n| --- | --- |\n| Missing data | Ask for help. |",
  ]) {
    assert.equal(publishMarkdown(table).markdown, table);
  }
});

test("does not interpret suggested prompt table examples inside code fences", () => {
  for (const delimiter of ["```", "~~~"]) {
    const source = [
      `${delimiter}markdown`,
      "| Title | Prompt |",
      "| --- | --- |",
      "| +++Example+++ | ++Copy this prompt.++ |",
      delimiter,
    ].join("\n");
    assert.throws(() => publishMarkdown(source), /lab-only reference/);
  }
});

test("rejects malformed or empty cells in Skillable suggested prompt tables", () => {
  for (const row of [
    "| +++Example+++ | Missing copy markers. |",
    "| +++Example+++ | ++Unescaped | pipe.++ |",
    "| +++ +++ | ++Copy this prompt.++ |",
    "| +++Example+++ | ++ ++ |",
  ]) {
    const source = ["| Title | Prompt |", "| --- | --- |", row].join("\n");
    assert.throws(() => publishMarkdown(source), /Suggested prompt table row 1/);
  }
});

test("preserves checkbox, hint, and page-break examples inside fenced prompt and code blocks", () => {
  for (const delimiter of ["```", "~~~"]) {
    const prompt = [
      `   ${delimiter}text`,
      "1. [ ] Keep this prompt step.",
      delimiter[0].repeat(2),
      "2. [ ] This shorter marker does not close the block.",
      delimiter === "```" ? "~~~" : "```",
      "3. [ ] A different marker does not close it either.",
      "> [!note] Keep this literal note example.",
      "> [!Hint] Keep this literal hint example.",
      "===",
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

test("preserves every prompt and workshop step while removing Skillable page breaks from the actual source", async () => {
  const source = await readFile(sourceFile, "utf8");
  const { markdown, images } = publishMarkdown(source);
  const prompts = (text) => text.match(/^[ \t]*```text\r?\n[\s\S]*?^[ \t]*```/gm);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const expectedPrompts = [...source.matchAll(/^[ \t]*```text\r?\n[\s\S]*?^[ \t]*```/gm)]
    .map((match) => ({ index: match.index, block: match[0] }));
  const promptRows = [...source.matchAll(/^\| \+\+\+(.+?)\+\+\+ \| \+\+(.+?)\+\+ \|[ \t]*$/gm)];
  assert.equal(promptRows.length, 3);
  for (const row of promptRows) {
    const title = row[1].replace(/\\\|/g, "|");
    const prompt = row[2].replace(/\\\|/g, "|");
    expectedPrompts.push({
      index: row.index,
      block: ["```text", prompt, "```"].join(newline),
    });
    assert.ok(markdown.includes(`### ${title}`));
  }
  expectedPrompts.sort((first, second) => first.index - second.index);
  assert.deepEqual(prompts(markdown), expectedPrompts.map(({ block }) => block));
  const steps = (text) => [...text.matchAll(/^## Step (\d+):/gm)].map((match) => Number(match[1]));
  const sourceSteps = steps(source);
  assert.ok(sourceSteps.length > 0);
  assert.deepEqual(sourceSteps, Array.from({ length: sourceSteps.length }, (_, index) => index + 1));
  assert.deepEqual(steps(markdown), sourceSteps);
  const pageBreakSteps = [...source.matchAll(/^===[ \t]*\r?\n\r?\n## Step (\d+):/gm)]
    .map((match) => Number(match[1]));
  assert.deepEqual(pageBreakSteps, sourceSteps);
  assert.doesNotMatch(source, /^.*\S.*\r?\n===[ \t]*$/m, "Leave a blank line before each page break.");
  assert.doesNotMatch(source, /^===[ \t]*\r?\n.*\S/m, "Leave a blank line after each page break.");
  assert.ok(images.length > 0);
  assert.doesNotMatch(markdown, /Lab00\.md|@lab\.|\+\+\+/);
  assert.doesNotMatch(markdown, /^\d+\.[ \t]+\[ \]/m);
  assert.doesNotMatch(markdown, /^===[ \t]*$/m);
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
