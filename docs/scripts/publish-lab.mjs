import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const sourceFile = fileURLToPath(
  new URL("../../instructions/Lab01.md", import.meta.url),
);
export const mediaDirectory = fileURLToPath(
  new URL("../../instructions/media/", import.meta.url),
);
export const generatedDirectory = fileURLToPath(
  new URL("../.vitepress/generated/", import.meta.url),
);
export const homeFile = fileURLToPath(new URL("../index.md", import.meta.url));
export const heroFile = fileURLToPath(new URL("../public/copilot.png", import.meta.url));

export function getSiteBase(basePath = "/ignite26-LAB740") {
  if (basePath !== "" && !/^\/(?!\/)/.test(basePath)) {
    throw new Error("PAGES_BASE_PATH must be empty or a path starting with a single slash.");
  }
  return `${basePath.replace(/\/+$/, "")}/`;
}

export function publishMarkdown(source) {
  const images = new Set();
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  let fence;
  let markdown = source.replace(/^.*$/gm, (line) => {
    const marker = line.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
    if (marker) {
      const [, delimiter, suffix] = marker;
      if (!fence) {
        fence = delimiter;
      } else if (
        delimiter[0] === fence[0] &&
        delimiter.length >= fence.length &&
        suffix.trim() === ""
      ) {
        fence = undefined;
      }
      return line;
    }
    return fence ? line : line
      .replace(/^([ \t]*\d+\.[ \t]+)\[ \][ \t]+/, "$1")
      .replace(
        /^([ \t]*>[ \t]*)\[!Hint\](?:[ \t]+(.*))?$/i,
        (_, quote, text) => `${quote}[!TIP]${text ? `${newline}${quote}${text}` : ""}`,
      );
  });
  markdown = markdown.replace(
    /\+\+\+(https?:\/\/[^\s+]+)\+\+\+/g,
    (_, url) => `[${url}](${url})`,
  );
  markdown = markdown.replace(
    /the account you selected from the \[workshop account table in Lab 00\]\(Lab00\.md(?:#[^)]+)?\)/g,
    "the account you are using",
  );
  markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, target) => {
    const prefix = "../instructions/media/";
    if (!target.startsWith(prefix)) {
      throw new Error(`Screenshot must come from instructions/media: ${target}`);
    }
    const relative = target.slice(prefix.length);
    if (
      !relative ||
      relative.includes("\\") ||
      relative.split("/").some((segment) => !segment || segment === "." || segment === "..")
    ) {
      throw new Error(`Invalid screenshot path: ${target}`);
    }
    images.add(relative);
    return `![${alt}](./media/${relative})`;
  });

  if (/Lab00\.md|@lab\.|\+\+\+/.test(markdown)) {
    throw new Error(
      "Lab01 contains a lab-only reference that needs a publishing transform. No site was generated.",
    );
  }
  return { markdown, images: [...images] };
}

async function writeAsset(destination, content) {
  await mkdir(path.dirname(destination), { recursive: true });
  if (!existsSync(destination) || !(await readFile(destination)).equals(content)) {
    await writeFile(destination, content);
  }
}

export async function prepareSite({ clean = false } = {}) {
  const [source, home, hero] = await Promise.all([
    readFile(sourceFile, "utf8"),
    readFile(homeFile, "utf8"),
    readFile(heroFile),
  ]);
  const { markdown, images } = publishMarkdown(source);
  const screenshots = await Promise.all(
    images.map((image) => readFile(path.join(mediaDirectory, ...image.split("/")))),
  );

  if (clean) {
    await rm(generatedDirectory, { recursive: true, force: true });
  }
  await mkdir(generatedDirectory, { recursive: true });
  for (const [index, image] of images.entries()) {
    const destination = path.join(generatedDirectory, "media", ...image.split("/"));
    await writeAsset(destination, screenshots[index]);
  }
  await writeAsset(path.join(generatedDirectory, "public", "copilot.png"), hero);
  await writeFile(path.join(generatedDirectory, "index.md"), home);
  await writeFile(path.join(generatedDirectory, "workshop.md"), markdown);
  return images;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const images = await prepareSite({ clean: true });
  console.log(`Prepared the landing page, Copilot hero, Lab01, and ${images.length} referenced screenshots.`);
}
