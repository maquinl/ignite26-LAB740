import path from "node:path";
import { defineConfig } from "vitepress";
import { getSiteBase, heroFile, homeFile, mediaDirectory, prepareSite, sourceFile } from "../scripts/publish-lab.mjs";

const themeScript = `(() => {
  const param = new URLSearchParams(window.location.search).get("scoutTheme");
  const theme =
    param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();`;

export default defineConfig({
  title: "Build your AI Chief of Staff",
  description: "Create a Human Persona and build your strategic partner agent in Microsoft 365 Copilot.",
  base: getSiteBase(process.env.PAGES_BASE_PATH),
  srcDir: ".vitepress/generated",
  cleanUrls: true,
  head: [["script", { id: "workshop-theme" }, themeScript]],
  themeConfig: {
    siteTitle: "Ignite 2026 · LAB740",
    nav: [
      { text: "Home", link: "/" },
      { text: "Workshop guide", link: "/workshop" },
      { text: "Microsoft 365 Copilot", link: "https://m365.cloud.microsoft/chat" },
    ],
    sidebar: false,
    outline: { level: [2, 3], label: "In this workshop" },
    search: { provider: "local" },
    socialLinks: [{ icon: "github", link: "https://github.com/maquinl/ignite26-LAB740" }],
    footer: { message: "Microsoft Ignite 2026 · LAB740" },
  },
  transformHtml(html) {
    const script = html.match(/<script id="workshop-theme">[\s\S]*?<\/script>/)?.[0];
    if (!script) {
      throw new Error("The workshop theme bootstrap is missing from the generated page.");
    }
    return html.replace(script, "").replace("<head>", `<head>${script}`);
  },
  vite: {
    plugins: [
      {
        name: "watch-workshop-source",
        configureServer(server) {
          server.watcher.add([sourceFile, mediaDirectory, homeFile, heroFile]);
        },
        async handleHotUpdate({ file }) {
          const changedFile = path.resolve(file);
          if (
            [sourceFile, homeFile, heroFile].includes(changedFile) ||
            changedFile.startsWith(path.resolve(mediaDirectory) + path.sep)
          ) {
            await prepareSite();
            return [];
          }
        },
      },
    ],
  },
});
