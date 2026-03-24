# OLED Stack Designer

A desktop application for creating OLED device layer structure diagrams.

Built with Electron + React + TypeScript.

---

## Features

- **Two stack modes**: Single Stack and RGB Natural Block Stack
- **Layer management**: Add, delete, duplicate, drag-and-drop reorder, inline editing
- **Thickness mode**: Toggle between uniform display and real proportional thickness
- **Export**: PNG and SVG export with 3 background options (transparent, white, black)
- **Save / Load**: JSON project files with crash recovery auto-backup
- **Undo / Redo**: 20-step history
- **Context menu**: Duplicate, FMM toggle, lock/unlock, delete
- **Color palettes**: Classic, Pastel, Vivid (3 options)
- **UI**: Glassmorphism design (panel + toolbar)
- **Example projects**: 3 included (basic OLED, minimal, RGB FMM)

---

## Screenshot

<!-- TODO: Add screenshot here -->

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Build for Windows

```bash
npm run build:win
```

The installer (`.exe`) will be generated in the `dist/` folder.

> Note: Windows cross-build from macOS requires Wine or GitHub Actions CI.

### Build for macOS

```bash
npm run build:mac
```

---

## Project Structure

```
src/
  main/         # Electron main process
  preload/      # Preload scripts
  renderer/     # React frontend
resources/
  examples/     # Example project JSON files
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built by [SidequestLab](https://github.com/namseokyoo)
