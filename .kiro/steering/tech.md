# Technology Stack Overview

## Monorepo Architecture

- **Structure**: Yarn workspace with apps in `apps/` and shared packages in `packages/`
- **Package Manager**: Yarn 1.22.x
- **Node.js**: Version 22.x
- **TypeScript**: Strict typing across all applications
- **Shared Configurations**: TypeScript configs in `packages/tsconfig/`

## Root Level Commands

```bash
# Install all dependencies
yarn install

# Start web development server
yarn dev
yarn server dev

# Start mobile development server
yarn nativeapp start

# Mobile platform specific
yarn nativeapp android
yarn nativeapp ios
```

## Environment Configuration

- **Root `.env`**: Shared environment variables across applications
- **Cross-app Dependencies**: tRPC for end-to-end type safety
- **Code Quality**: ESLint and Prettier configured for both apps

## Prerequisites

- Node.js 22.x
- Yarn 1.22.x
- PostgreSQL with PostGIS extension

For detailed technology specifications, see:

- [Server Technology Stack](server.tech.md)
- [Native App Technology Stack](nativeapp.tech.md)
