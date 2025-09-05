# Technical Stack

> Last Updated: 2025-09-03
> Version: 1.0.0

## Application Framework

- **Framework:** Next.js 15 (web dashboard) + React Native with Expo (mobile app) in monorepo structure
- **Version:** Next.js 15, React Native with Expo
- **Architecture:** Monorepo with shared packages for UI components, utilities, and types

## Database

- **Primary Database:** PostgreSQL via Supabase

## JavaScript

- **Framework:** React + TypeScript
- **Import Strategy:** node

## CSS Framework

- **Framework:** Tailwind CSS v4

## UI Components

- **Component Library:** Shadcn UI
- **Icon Library:** Lucide React
- **Fonts Provider:** Google Fonts

## Mobile Development

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Offline Storage:** React Native AsyncStorage with sync mechanism

## Web Development

- **Framework:** Next.js 15
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn UI
- **Language:** TypeScript

## Backend Services

- **Backend Platform:** Supabase
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth with role-based access
- **File Storage:** Supabase Storage for photos/documents

## Mapping & GIS

- **Mapping Library:** Leaflet.js integration
- **File Format Support:** KML file support

## Hosting & Deployment

- **Application Hosting:** Hostinger VPS
- **Database Hosting:** Supabase
- **Asset Hosting:** Supabase Storage
- **Deployment Solution:** Hostinger VPS deployment

## Code Repository

- **Repository URL:** [To be determined]

## Architecture Overview

### Monorepo Structure
```
project-root/
├── apps/
│   ├── mobile/          # React Native Expo app
│   └── web/             # Next.js web dashboard
├── packages/
│   ├── shared/          # Shared utilities and business logic
│   ├── ui/              # Shared UI components and design system
│   └── types/           # Shared TypeScript types
└── tools/               # Shared development tools and configs
```

### Frontend Applications
- **Web Dashboard:** Next.js 15 with server-side rendering and static generation (apps/web)
- **Mobile App:** React Native with Expo for cross-platform compatibility (apps/mobile)
- **Shared UI:** Consistent design system using Tailwind CSS and Shadcn UI (packages/ui)
- **Shared Logic:** Common utilities, API clients, and business logic (packages/shared)
- **Shared Types:** TypeScript type definitions used across all applications (packages/types)

### Backend Infrastructure
- **Database:** PostgreSQL managed by Supabase with real-time subscriptions
- **Authentication:** Role-based access control through Supabase Auth
- **File Management:** Supabase Storage for handling photos, documents, and KML files
- **API:** Supabase auto-generated REST and GraphQL APIs

### Data Synchronization
- **Real-time Updates:** Supabase real-time subscriptions for live data
- **Offline Support:** AsyncStorage caching with automatic sync when online
- **File Sync:** Background synchronization of photos and documents

### Deployment Strategy
- **Production:** Hostinger VPS with containerized deployment
- **Database:** Supabase cloud hosting with automated backups
- **Assets:** CDN delivery through Supabase Storage