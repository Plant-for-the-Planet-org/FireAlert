# Project Structure & Organization

## Monorepo Layout

```
FireAlert/
├── apps/
│   ├── nativeapp/          # React Native mobile application
│   └── server/             # Next.js web application & API
├── packages/
│   └── tsconfig/           # Shared TypeScript configurations
├── scripts/                # Utility scripts (e.g., import-npa)
├── docs/                   # Documentation and SQL files
└── .env                    # Root environment variables
```

## File Naming Conventions

- **Components**: PascalCase (e.g., `CustomButton.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useCountdown.ts`)
- **Services**: PascalCase classes (e.g., `GeoEventProvider`)
- **Utils**: camelCase functions (e.g., `distanceCalculator.ts`)
- **Constants**: camelCase files, UPPER_CASE exports
- **Screens**: PascalCase matching component name

## Import Organization

- **Absolute Imports**: Configured via TypeScript path mapping
- **Barrel Exports**: `index.tsx` files for clean imports
- **Asset Management**: Centralized in `assets/` with organized subdirectories

## Environment & Configuration

- **Root `.env`**: Shared across applications
- **App-specific Config**: `react-native-config` for mobile, `next.config.mjs` for web
- **TypeScript Config**: Shared base configurations in `packages/tsconfig/`

For detailed application structures, see:

- [Server Structure](server.structure.md)
- [Native App Structure](nativeapp.structure.md)
