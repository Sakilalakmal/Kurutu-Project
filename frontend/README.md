This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Kurutu Editor (Phase 1)

The Phase 1 diagram editor is available at:

- `http://localhost:3000/editor`

Run locally:

```bash
npm install
npx prisma migrate dev --name add_diagram_model
npx prisma generate
npm run dev
```

Phase 1 includes:

- Protected editor shell route
- Rectangle/Ellipse/Sticky nodes with drag/select/text edit
- Auto-save + manual save to Postgres (Prisma)

Phase 1 limitations:

- No connectors/edges yet
- No realtime collaboration
- No export/templates yet

## Kurutu Editor (Phase 2)

Phase 2 adds:

- Connectors/edges with arrowheads (`smoothstep` default, optional `straight`)
- Edge persistence in diagram JSON
- Grid visibility toggle + snap-to-grid toggle
- Undo/redo for node/edge/text commits
- Keyboard shortcuts for undo/redo/delete/escape

### Manual verification checklist

1. Open `http://localhost:3000/editor` and create a few nodes.
2. Drag from a node handle to another node to create an edge with arrowhead.
3. Move nodes and confirm connected edges stay attached.
4. Refresh page and confirm nodes + edges are restored.
5. Toggle edge default style and create a new edge; confirm new edge uses the selected style.
6. With snap enabled, drag nodes and confirm they land on 10px grid increments.
7. Toggle grid visibility independently from snap behavior.
8. Select a node or edge and press `Delete`/`Backspace`; confirm removal.
9. Press `Esc` and confirm selection clears.
10. Use `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, and `Ctrl/Cmd+Y` for undo/redo.
11. Double-click node text, edit, commit with blur/Enter, then undo/redo text changes.
12. Hold `Space` and drag to pan the canvas.
