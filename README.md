# aacrm

Modern, lightweight CRM for boutique wedding and experiential studios. Built with Next.js 15, Tailwind CSS 4, and shadcn-inspired UI primitives, **aacrm** keeps clients, vendors, events, and billing organized in one calming workspace.

## Features

- **Mobile-first dashboard** with at-a-glance metrics, upcoming event timeline, and weekly workflow prompts.
- **Client, vendor, event, and invoice management** with quick-add forms that persist locally via browser storage.
- **CSV export** button for sharing roster snapshots with other tools or storing backups.
- **Wix-ready embed guidance** so you can surface the CRM inside an existing Wix member area without extra engineering.
- **Local-first data model** seeded with sample records for rapid prototyping and sales demos.

## Tech stack

- [Next.js 15 (App Router)](https://nextjs.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) with custom theme tokens
- shadcn-style component primitives (Button, Card, Tabs, etc.)
- [lucide-react](https://lucide.dev/) icon set
- Local storage state management via React hooks

## Getting started

`ash
npm install
npm run dev
`

Visit [http://localhost:3000](http://localhost:3000) to explore the CRM. All data is stored in localStorage, so browser refreshes keep your workspace intact. Use the "New record" CTA or the quick-add forms in each tab to seed your own information.

## Downloading the packaged zip

Need an archive you can move to another machine? Run the helper scripts below (the repo intentionally ignores acrm.zip, so generate it locally whenever you need a fresh copy):

`ash
# refresh aacrm.zip from the latest commit
npm run package:zip

# make it downloadable at http://localhost:4321/aacrm.zip
npm run serve:zip
`

Leave serve:zip running, then download the file from a browser, with curl, or via your tunneling tool of choice. The server automatically responds with a link page at http://localhost:4321/ and streams the archive at /aacrm.zip.

## Embedding inside Wix

1. Deploy this project to [Vercel](https://vercel.com/) or your preferred host. Copy the deployed URL (for example, https://studio.yourdomain.com).
2. In Wix, add **Embed > Custom Embed > Embed a Site** to the page where your team will access aacrm.
3. Paste the deployed URL, set the iframe height to 100%, and enable auto-resize for responsive behavior on mobile and desktop layouts.
4. Gate the Wix page with a member area or password to limit access to internal users.

The Integrations tab inside aacrm also includes these steps plus ideas for Zapier automations and vendor collaboration.

## Exporting data

Need to share details with other tools? Open the **Integrations > Export roster CSV** button to download a CSV that combines clients, vendors, events, and invoice information.

## Project structure

`
src/
  app/
    layout.tsx      # global metadata and fonts
    page.tsx        # CRM experience (tabs, dashboard, integrations)
  components/
    crm/            # quick-add forms for each entity
    ui/             # shadcn-inspired primitives
  data/sample.ts    # starter dataset for demoing the CRM
  hooks/use-crm-data.ts # localStorage-backed data layer
  lib/              # helpers for formatting and utilities
`

## Development notes

- Tailwind tokens live in src/app/globals.css and include brand colors #c83a2c and #f9dfb1.
- UI components are headless and reusable—add new views by composing them in page.tsx or additional route segments.
- Because data lives in the browser, integrating with a backend (Supabase, Airtable, etc.) simply requires swapping the useCrmData hook.

Enjoy building on top of **aacrm**!
