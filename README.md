# Hasha Dar Portfolio

Modern portfolio website built with Next.js 16, featuring photography work.

## Tech Stack

- **Next.js 16** with App Router and React Compiler
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Optimised images** with WebP/AVIF support

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view locally.

## Production

```bash
npm run build
npm start
```

Optimised for deployment on AWS Amplify.

## CI and deployment

Pull requests and pushes to `main` run **GitHub Actions** (lint, typecheck, tests, production build). **Deployment** is **AWS Amplify** autobuild only (`amplify.yml` at the repo root); Actions do not deploy. Environment variable names used on Amplify and branch protection expectations are in **[docs/CI-AND-DEPLOYMENT.md](docs/CI-AND-DEPLOYMENT.md)**.
