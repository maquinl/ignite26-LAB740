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

Open the local URL printed by VitePress, including the `/ignite26-LAB740/` base path. Changes to the landing page, hero image, Lab01, or its screenshots refresh the preview.

## Test and build

```powershell
npm --prefix docs test
npm --prefix docs run docs:build
npm --prefix docs run docs:preview
```

The build copies the landing page and Copilot hero image, converts lab-only URL formatting in the workshop, removes its link to the Lab00 account table, and copies only screenshots referenced by Lab01. All prompt text is preserved. Missing images or unhandled lab-only references fail the build.

Generated content, cache, and output stay under `.vitepress/` and are ignored by Git.
