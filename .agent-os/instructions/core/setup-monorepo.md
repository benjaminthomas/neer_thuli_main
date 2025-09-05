---
description: Monorepo Setup Workflow for React Native Expo + Next.js Projects
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Monorepo Setup Workflow

## Overview

Configure monorepo structure for projects with both React Native Expo mobile app and Next.js web dashboard sharing common components, utilities, and design systems.

<pre_flight_check>
  EXECUTE: @.agent-os/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="analyze_monorepo_requirements">

### Step 1: Analyze Monorepo Requirements

Use the context-fetcher subagent to analyze the project's structure and determine the optimal monorepo configuration.

<analysis_areas>
  <shared_code>
    - Common UI components between web and mobile
    - Shared business logic and utilities
    - Common types and interfaces
    - Shared API client and data models
  </shared_code>
  <platform_specific>
    - Platform-specific UI adaptations
    - Native functionality requirements
    - Web-specific optimizations
    - Different deployment targets
  </platform_specific>
  <toolchain_requirements>
    - Shared build tools and configurations
    - Common linting and formatting rules
    - Unified testing strategies
    - Package management approach
  </toolchain_requirements>
</analysis_areas>

<instructions>
  ACTION: Use context-fetcher subagent
  REQUEST: "Analyze monorepo requirements:
            - Identify shared code opportunities from tech-stack.md and roadmap.md
            - Determine platform-specific requirements
            - Assess build tool and workflow needs
            - Identify dependency management strategy"
  PROCESS: Returned analysis
  IDENTIFY: Optimal monorepo structure and tooling
</instructions>

</step>

<step number="2" subagent="file-creator" name="create_monorepo_structure">

### Step 2: Create Monorepo Structure

Use the file-creator subagent to create the recommended monorepo directory structure.

<monorepo_structure>
  project-root/
  ├── apps/
  │   ├── mobile/          # React Native Expo app
  │   │   ├── package.json
  │   │   ├── app.json
  │   │   ├── App.tsx
  │   │   └── src/
  │   └── web/             # Next.js web dashboard
  │       ├── package.json
  │       ├── next.config.js
  │       ├── pages/
  │       └── src/
  ├── packages/
  │   ├── shared/          # Shared utilities and logic
  │   │   ├── package.json
  │   │   └── src/
  │   ├── ui/              # Shared UI components
  │   │   ├── package.json
  │   │   └── src/
  │   └── types/           # Shared TypeScript types
  │       ├── package.json
  │       └── src/
  ├── tools/
  │   ├── eslint-config/   # Shared ESLint configuration
  │   └── tsconfig/        # Shared TypeScript configurations
  ├── package.json         # Root package.json with workspaces
  ├── tsconfig.json        # Root TypeScript config
  └── .gitignore
</monorepo_structure>

<workspace_configuration>
{
  "name": "project-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "tools/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:web\" \"npm run dev:mobile\"",
    "dev:web": "cd apps/web && npm run dev",
    "dev:mobile": "cd apps/mobile && npm start",
    "build": "npm run build:packages && npm run build:apps",
    "build:packages": "npm run build --workspaces --if-present",
    "build:apps": "npm run build:web && npm run build:mobile",
    "build:web": "cd apps/web && npm run build",
    "build:mobile": "cd apps/mobile && npx expo export",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "clean": "npm run clean --workspaces --if-present && rm -rf node_modules"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "typescript": "^5.0.0"
  }
}
</workspace_configuration>

</step>

<step number="3" subagent="file-creator" name="create_shared_packages">

### Step 3: Create Shared Package Configurations

Use the file-creator subagent to create shared package configurations for common code.

<shared_ui_package>
{
  "name": "@project/ui",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "test": "jest"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-native": "^0.72.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-native": ">=0.72.0"
  }
}
</shared_ui_package>

<shared_types_package>
{
  "name": "@project/types",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
</shared_types_package>

<shared_utils_package>
{
  "name": "@project/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "test": "jest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
</shared_utils_package>

</step>

<step number="4" subagent="file-creator" name="create_app_configurations">

### Step 4: Create App-Specific Configurations

Use the file-creator subagent to create configurations for both mobile and web applications.

<mobile_app_package>
{
  "name": "mobile-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build": "expo export",
    "lint": "eslint .",
    "test": "jest"
  },
  "dependencies": {
    "@project/ui": "workspace:*",
    "@project/shared": "workspace:*",
    "@project/types": "workspace:*",
    "expo": "~49.0.0",
    "react": "18.2.0",
    "react-native": "0.72.0"
  },
  "devDependencies": {
    "@expo/config": "~8.0.0",
    "typescript": "^5.0.0"
  }
}
</mobile_app_package>

<web_app_package>
{
  "name": "web-dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest"
  },
  "dependencies": {
    "@project/ui": "workspace:*",
    "@project/shared": "workspace:*",
    "@project/types": "workspace:*",
    "next": "^15.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
</web_app_package>

</step>

<step number="5" subagent="file-creator" name="create_toolchain_configs">

### Step 5: Create Shared Toolchain Configurations

Use the file-creator subagent to create shared configurations for TypeScript, ESLint, and other development tools.

<root_tsconfig>
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@project/ui": ["./packages/ui/src"],
      "@project/shared": ["./packages/shared/src"],
      "@project/types": ["./packages/types/src"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", ".expo", ".next"]
}
</root_tsconfig>

<eslint_config>
{
  "name": "@project/eslint-config",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^15.0.0",
    "eslint-plugin-react": "^7.0.0",
    "eslint-plugin-react-hooks": "^4.0.0",
    "eslint-plugin-react-native": "^4.0.0"
  }
}
</eslint_config>

</step>

<step number="6" name="workflow_integration">

### Step 6: Integrate with Existing Workflows

Update existing Agent OS workflows to work with the monorepo structure.

<workflow_updates>
  <execute_task_updates>
    - Update task execution to consider workspace context
    - Add monorepo-specific build and test commands
    - Include cross-app dependency considerations
  </execute_task_updates>
  <design_system_updates>
    - Reference shared UI package in design system setup
    - Update component guidelines for cross-platform usage
    - Include platform-specific adaptation patterns
  </design_system_updates>
  <mcp_workflow_updates>
    - Update MCP server configurations for monorepo structure
    - Include workspace-aware file operations
    - Update database operations for shared data models
  </mcp_workflow_updates>
</workflow_updates>

<instructions>
  ACTION: Review existing workflow files
  UPDATE: Workflow instructions for monorepo context
  VALIDATE: All workflows work with new structure
  DOCUMENT: Monorepo-specific considerations
</instructions>

</step>

</process_flow>

## Monorepo Development Guidelines

### Package Management
- Use npm workspaces for dependency management
- Install shared dependencies at the root level when possible
- Use `workspace:*` for internal package dependencies
- Run `npm install` from the root to install all dependencies

### Development Workflow
- Start development with `npm run dev` from root (starts both apps)
- Build all packages before building apps: `npm run build`
- Run tests across all workspaces: `npm run test`
- Lint all code: `npm run lint`

### Code Sharing Best Practices
- Keep shared UI components platform-agnostic when possible
- Use conditional exports for platform-specific implementations
- Maintain consistent APIs across platform adaptations
- Document platform-specific behaviors and limitations

### Deployment Considerations
- Web app deploys to Hostinger VPS as configured
- Mobile app builds through Expo for app stores
- Shared packages are bundled with consuming applications
- Consider separate CI/CD pipelines for different deployment targets

<post_flight_check>
  EXECUTE: @.agent-os/instructions/meta/post-flight.md
</post_flight_check>