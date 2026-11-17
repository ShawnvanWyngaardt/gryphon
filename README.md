# James the Gryphon

James the Gryphon checks whether your UI code still follows your DESIGN.md. It reads the design tokens in your project's [DESIGN.md](https://github.com/google-labs-code/design.md) and scans your CSS, SCSS, Vue and Tailwind code for colours, fonts, font sizes, spacing and corner radii that are not in those tokens. For each one it tells you the file, the line, the nearest token and how to fix it. It will run as a CLI, as a GitHub Action that checks the files a pull request touches, and as a browser playground where nothing you paste ever leaves your machine. The project is in development: see [docs/SPEC.md](docs/SPEC.md) and [docs/STATUS.md](docs/STATUS.md).

Built by Claude Code. Directed and reviewed by Shawn.

## Run it locally

The package is not on npm yet. Until it is, run it from a clone of this repo, in the repo's root folder. You need Node 22.13 or newer.

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run gryphon -- check
```

The `--` passes the rest to the CLI. `npm run gryphon -- --help` lists the options.

`npm run gryphon` checks from the repo root, so paths are relative to it. To check another project, pass its folder and its DESIGN.md:

```bash
npm run gryphon -- check ../my-app/src --design ../my-app/DESIGN.md
```

Or run the built file from inside the other project, so paths in the report are relative to it:

```bash
node /path/to/gryphon/packages/gryphon-designmd/dist/src/cli/main.js check
```

It checks `.css`, `.scss` and `.vue` files: Vue `<style>` blocks (CSS and SCSS) and static `style` attributes. Tailwind classes follow later in Gate 4.

**Do not use `npx gryphon`.** Before our package is published, `npx` cannot find a local command with that name, so it downloads an unrelated npm package called `gryphon` instead. After release, the command will be `npx gryphon-designmd`.
