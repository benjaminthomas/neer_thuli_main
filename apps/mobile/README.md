# Neer Thuli Mobile App

React Native mobile application built with Expo for water infrastructure monitoring.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm run dev

# Run on specific platform
pnpm run android
pnpm run ios
pnpm run web
```

## Tech Stack

- React Native with Expo
- Expo Router for navigation
- TypeScript
- Supabase for backend services
- Shared packages from monorepo

## Project Structure

```
apps/mobile/
├── app/              # Expo Router app directory
├── components/       # React Native components
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── assets/          # Static assets
├── app.json         # Expo configuration
└── package.json     # Package configuration
```

This app is part of the Neer Thuli monorepo and shares code with the web dashboard through the `@neer-thuli/shared` package.