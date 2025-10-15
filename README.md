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

## Development: Checkpoints & Feature Flags

### Checkpoints & Feature Branches

To safely try new features and be able to quickly roll back:

1) Create a checkpoint and start a feature branch:

```bash
npm run checkpoint "stable before <feature-name>"
npm run start-feature <feature-name>
```

This will:
- Commit any staged changes (and create a checkpoint commit if needed)
- Create a tag `checkpoint-<feature-name>-<timestamp>`
- Create and switch to `feature/<feature-name>`

2) Roll back to a checkpoint if needed:

```bash
git switch main
git reset --hard <tagname>
```

### Feature Flags

Add flags in `.env.local`:

```
NEXT_PUBLIC_FEATURE_EXAMPLE=0
```

Check in code:

```ts
import { isEnabled } from "@/lib/featureFlags";

if (isEnabled('FEATURE_EXAMPLE')) {
  // gated feature
}
```
