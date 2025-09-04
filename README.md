# Neer Thuli - Water Infrastructure Monitoring Platform

A comprehensive monorepo for water infrastructure monitoring with web dashboard and mobile applications.

## 🏗️ Project Structure

```
neer-thuli-monorepo/
├── apps/
│   ├── web/              # Next.js 15 web dashboard
│   └── mobile/           # React Native with Expo mobile app
├── packages/
│   ├── shared/           # Shared types, utilities, and constants
│   └── ui/               # Shared Shadcn UI components
├── supabase/             # Database migrations and configurations
├── tests/                # End-to-end and integration tests
└── .agent-os/           # Agent OS configuration and specs
```

## 🚀 Tech Stack

### Frontend
- **Web:** Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Mobile:** React Native, Expo, TypeScript
- **UI Components:** Shadcn UI with shared component library
- **Styling:** Tailwind CSS v4 across all platforms

### Backend & Services
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth with role-based access
- **Storage:** Supabase Storage for files and media
- **Real-time:** Supabase real-time subscriptions

### Development Tools
- **Package Manager:** pnpm with workspaces
- **Testing:** Playwright for E2E testing
- **Documentation:** MCP servers for context-aware development

## 📦 Installation

### Prerequisites
- Node.js ≥18
- pnpm ≥8.0.0
- Supabase CLI (optional, for database management)

### Setup

```bash
# Install dependencies for all packages
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

## 🛠️ Development

### Start Development Servers

```bash
# Start all apps concurrently
pnpm run dev

# Start specific app
pnpm run dev:web     # Web dashboard only
pnpm run dev:mobile  # Mobile app only
```

### Build Applications

```bash
# Build all applications
pnpm run build

# Build specific app
pnpm run build:web
pnpm run build:mobile
```

### Testing

```bash
# Run all tests
pnpm run test

# Run specific test suites
pnpm run test:auth
pnpm run test:database
pnpm run test:rls
```

### Linting & Type Checking

```bash
# Lint all packages
pnpm run lint

# Type check all packages
pnpm run type-check
```

## 📱 Applications

### Web Dashboard (`apps/web`)
- Modern web dashboard built with Next.js 15
- Server-side rendering and static generation
- Interactive maps with KML file support
- Real-time data visualization
- Responsive design with Tailwind CSS v4

### Mobile App (`apps/mobile`)
- Cross-platform mobile app with React Native and Expo
- Offline-first data collection
- GPS location tracking
- Photo capture and validation
- Synchronization with web dashboard

## 📚 Shared Packages

### `@neer-thuli/shared`
- Common types and interfaces
- Utility functions
- API client configurations
- Constants and configuration

### `@neer-thuli/ui`
- Shared Shadcn UI components
- Consistent design system
- Reusable across web and mobile (where applicable)
- Tailwind CSS styling utilities

## 🗃️ Database

The project uses Supabase PostgreSQL with:
- User authentication and authorization
- Row-level security (RLS) policies
- Real-time subscriptions
- File storage integration
- Comprehensive audit logging

Database migrations and configurations are in the `supabase/` directory.

## 🔧 Configuration

### Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key
CONTEXT7_API_KEY=your_context7_key
```

### MCP Servers

The project is configured with MCP servers for:
- **context7**: Latest framework documentation
- **supabase**: Database operations and real-time features
- **shadcn**: UI component library
- **playwright**: Testing and automation

## 🚦 Development Workflow

1. **Feature Development**: Work in feature branches
2. **Shared Components**: Add to `packages/ui` for reusability
3. **Business Logic**: Add to `packages/shared` for cross-platform use
4. **Testing**: Write tests for new features using Playwright
5. **Documentation**: Update specs in `.agent-os/` as needed

## 📋 Project Management

The project uses Agent OS for:
- Feature specifications and roadmap
- Development standards and guidelines
- Testing protocols
- Deployment procedures

See `.agent-os/` directory for detailed specifications and guidelines.

## 🏆 Key Features

- **Monorepo Architecture**: Efficient code sharing and development
- **Modern Tech Stack**: Latest versions of Next.js, React, and Tailwind
- **Real-time Collaboration**: Live updates across all platforms
- **Offline-First Mobile**: Works without internet connectivity
- **Geospatial Integration**: KML file support and interactive mapping
- **Comprehensive Testing**: End-to-end testing with Playwright
- **Enterprise Ready**: Scalable architecture and security features

## 🤝 Contributing

1. Follow the established code patterns in existing files
2. Use shared components from `@neer-thuli/ui` when possible
3. Add new utilities to `@neer-thuli/shared` for cross-platform use
4. Write tests for new features
5. Update documentation as needed

## 📄 License

Private project - All rights reserved.