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

## Fonts

Fonts are loaded with [`next/font/google`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) in `app/layout.tsx` and exposed as Tailwind v4 theme tokens in `app/globals.css`.

| Role | Font | Tailwind class | Notes |
| --- | --- | --- | --- |
| Sans / body | [Inter](https://fonts.google.com/specimen/Inter) | `font-sans` | Default on `<body>` |
| Mono | [Fira Code](https://fonts.google.com/specimen/Fira+Code) | `font-mono` | |
| Display | [Mona Sans](https://fonts.google.com/specimen/Mona+Sans) | `font-display` | Width 125 (Expanded) via the `wdth` axis |

Mona Sans is a variable font (`wdth` 75–125, `wght` 200–900). The `wdth` axis is loaded explicitly and pinned to 125 with `font-variation-settings`, not `font-stretch`.

```tsx
// app/layout.tsx
import { Inter, Fira_Code, Mona_Sans } from "next/font/google";

const fontDisplay = Mona_Sans({
  variable: "--font-mona",
  subsets: ["latin"],
  axes: ["wdth"],
});

// <html className={`${inter.variable} ${firaCode.variable} ${fontDisplay.variable}`}>
```

```css
/* app/globals.css */
@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-fira-code);
  --font-display: var(--font-mona);
  --font-display--font-variation-settings: "wdth" 125;
}
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
