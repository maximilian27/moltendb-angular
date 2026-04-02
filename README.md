# angular-moltendb — Sample App

A sample Angular application demonstrating the [`@moltendb-web/angular`](https://www.npmjs.com/package/@moltendb-web/angular) library.

It showcases real-world usage of MoltenDB in an Angular project, including CRUD operations on a laptop catalogue and a stress-test / benchmarking page.

> **Fully offline, no backend required.**  
> All data is persisted in the browser's [Origin Private File System (OPFS)](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) — data survives page reloads and even browser crashes, and is only cleared when you explicitly wipe the OPFS storage.

---

## Related links

- 📦 **npm package** — [@moltendb-web/angular](https://www.npmjs.com/package/@moltendb-web/angular)
- 📖 **Library README** — [packages/angular/README.md](https://github.com/maximilian27/moltendb-web/blob/develop/packages/angular/README.md)

---

## What's inside

| Route | Description |
|---|---|
| `/laptops` | Browse, create, update and delete laptop entries stored in MoltenDB |
| `/stress-test` | Benchmark MoltenDB — single write (1 000 docs) and batch write (25 × 1 000 docs) |

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Angular ≥ 17
- **No backend needed** — MoltenDB runs entirely in the browser via OPFS

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm start
```

Open your browser at `http://localhost:4200/`.

### Build for production

```bash
npm run build
```

The build artifacts are placed in the `dist/` directory.

### Run tests

```bash
npm test
```

---

## Using `@moltendb-web/angular` in your own project

Install the package:

```bash
npm install @moltendb-web/angular
```

Then follow the full integration guide in the [library README](https://github.com/maximilian27/moltendb-web/blob/develop/packages/angular/README.md).
