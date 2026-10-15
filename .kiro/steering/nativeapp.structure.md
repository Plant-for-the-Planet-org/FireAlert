# Native App Structure (apps/nativeapp)

## Directory Layout

```
apps/nativeapp/
├── app/
│   ├── api/                # API configuration (axios, tRPC)
│   ├── assets/             # Images, fonts, SVGs, animations
│   ├── components/         # Reusable UI components
│   ├── constants/          # App constants (country codes, web and store URLs)
│   ├── contexts/           # React contexts (PushNotificationContext: FCM state, taps, foreground banners)
│   ├── global/             # Global state management
│   │   ├── actions/        # Redux action types
│   │   └── reducers/       # Context providers
│   ├── hooks/              # Custom React hooks
│   │   ├── notification/   # Push notification and app linking hooks
│   │   ├── redux/          # Redux hooks
│   │   └── timer/          # Timer utilities
│   ├── redux/              # Redux store and slices
│   ├── routes/             # Navigation configuration
│   ├── screens/            # Screen components
│   ├── services/           # Service layer
│   │   ├── trpc.tsx        # tRPC client configuration
│   │   └── PushNotification/ # FCM + Notifee state manager, device sync logic, types
│   ├── styles/             # Theme, colors, typography
│   └── utils/              # Utility functions (incl. PromptInAppUpdate: mandatory update gate)
├── android/                # Android-specific configuration
├── ios/                    # iOS-specific configuration
└── __tests__/              # Test files
```

## Mobile App Patterns

- **Component Organization**: Atomic design with reusable components
- **Hook-based Logic**: Custom hooks for specific functionality
- **Context + Redux**: Global state with Context API and Redux Toolkit
- **Screen-based Routing**: React Navigation with stack navigators
