# Workshop website

The VitePress site has a landing page linking to a workshop generated from [Lab01](../instructions/Lab01.md) and its referenced screenshots. The Skillable instructions remain unchanged. The workshop account setup in Lab00 is not published.

Edit [index.md](index.md) for the landing page's title, description, and button. Its hero image is [public/copilot.png](public/copilot.png). Edit Lab01 for the workshop content, never the generated pages. The local preview includes a landing page and a separate workshop route.

This folder contains the site's package files, configuration, theme, and publishing scripts. No root-level Node project is required.

## Preview locally

Use Node.js 22.12 or later. From the repository root:

```powershell
npm --prefix docs ci
npm --prefix docs run docs:dev
```

Open the local URL printed by VitePress, which defaults to the `/ignite26-LAB740/` base path. Changes to the landing page, hero image, Lab01, or its screenshots refresh the preview.

## Test and build

```powershell
npm --prefix docs test
npm --prefix docs run docs:build
npm --prefix docs run docs:preview
```

The build copies the landing page and Copilot hero image, converts lab-only URL formatting in the workshop, removes its link to the Lab00 account table, and copies only screenshots referenced by Lab01. Skillable's `[ ]` markers are removed from numbered steps on the website, leaving the numbered instructions intact. Skillable `[!Hint]` blocks are converted to VitePress tips. Standalone `===` page breaks are omitted from the website. The Skillable source and all fenced prompt text are preserved. Missing images or unhandled lab-only references fail the build.

Write Skillable callouts as `> [!note] Note text` or `> [!hint] Hint text`, using lowercase markers and keeping the body on the same line. Use notes for context and checks, and hints for tips and help. Inside the lab's numbered tasks, indent these lines four spaces. Continue additional paragraphs in the same callout with a quoted blank line and the same indentation. Keep section-wide guidance unindented so it does not become part of the preceding task. Website publishing converts these to VitePress note and tip blocks.

Suggested prompts use a two-column **Title** / **Prompt** table with `+++title+++` (type into the VM) and `++prompt++` (copy to clipboard) in Skillable. Website publishing turns each row into a heading and a full-width text code block with a Copy button. Escape literal pipes inside table cells as `\|`.

Generated content, cache, and output stay under `.vitepress/` and are ignored by Git.

## Deployment paths

The deployment workflow supplies `PAGES_BASE_PATH` from the site's configuration, so root-hosted sites and repository-path sites use the correct asset and navigation URLs automatically. An empty value or `/` builds at the domain root; `/ignite26-LAB740` builds under that project path. If the variable is unset, local development keeps the existing `/ignite26-LAB740/` default.

To check a root-hosted build locally:

```powershell
$env:PAGES_BASE_PATH = "/"
npm --prefix docs run docs:build
npm --prefix docs run docs:preview
```

Remove `PAGES_BASE_PATH` from the shell environment and rebuild to return to the default path.
