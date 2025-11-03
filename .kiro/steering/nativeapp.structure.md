# Native App Structure (apps/nativeapp)

## Directory Layout

```
apps/nativeapp/
├── app/
│   ├── api/                # API configuration (axios, tRPC)
│   ├── assets/             # Images, fonts, SVGs, animations
│   ├── components/         # Reusable UI components
│   ├── constants/          # App constants (country codes, URLs)
│   ├── global/             # Global state management
│   │   ├── actions/        # Redux action types
│   │   └── reducers/       # Context providers
│   ├── hooks/              # Custom React hooks
│   │   ├── notification/   # OneSignal and app linking hooks
│   │   ├── redux/          # Redux hooks
│   │   └── timer/          # Timer utilities
│   ├── redux/              # Redux store and slices
│   ├── routes/             # Navigation configuration
│   ├── screens/            # Screen components
│   ├── services/           # tRPC client configuration
│   ├── styles/             # Theme, colors, typography
│   └── utils/              # Utility functions
├── android/                # Android-specific configuration
├── ios/                    # iOS-specific configuration
└── __tests__/              # Test files
```

## Mobile App Patterns

- **Component Organization**: Atomic design with reusable components
- **Hook-based Logic**: Custom hooks for specific functionality
- **Context + Redux**: Global state with Context API and Redux Toolkit
- **Screen-based Routing**: React Navigation with stack navigators
