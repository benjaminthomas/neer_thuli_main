# Tech Stack

## Context

Global tech stack defaults for Agent OS projects, overridable in project-specific `.agent-os/product/tech-stack.md`. Includes MCP server and design system integration standards.

- App Framework: Ruby on Rails 8.0+
- Language: Ruby 3.2+
- Primary Database: PostgreSQL 17+
- ORM: Active Record
- JavaScript Framework: React latest stable
- Build Tool: Vite
- Import Strategy: Node.js modules
- Package Manager: npm
- Node Version: 22 LTS
- CSS Framework: TailwindCSS 4.0+
- UI Components: Instrumental Components latest
- UI Installation: Via development gems group
- Font Provider: Google Fonts
- Font Loading: Self-hosted for performance
- Icons: Lucide React components
- Application Hosting: Digital Ocean App Platform/Droplets
- Hosting Region: Primary region based on user base
- Database Hosting: Digital Ocean Managed PostgreSQL
- Database Backups: Daily automated
- Asset Storage: Amazon S3
- CDN: CloudFront
- Asset Access: Private with signed URLs
- CI/CD Platform: GitHub Actions
- CI/CD Trigger: Push to main/staging branches
- Tests: Run before deployment
- Production Environment: main branch
- Staging Environment: staging branch

## MCP Server Integration

- MCP Servers: Enable for enhanced tooling capabilities
- Database Operations: mcp-server-postgres for advanced queries
- File Operations: mcp-server-filesystem for bulk operations
- Git Operations: mcp-server-git for repository management
- Web Services: mcp-server-fetch for API integrations
- Development Tools: mcp-server-sqlite for local development

## Design System Standards

- Design Tokens: CSS custom properties + framework config
- Component Library: Framework-specific (React: Shadcn/ui, Rails: ViewComponent)
- Accessibility: WCAG 2.1 AA compliance minimum
- Responsive Design: Mobile-first approach
- Performance: Components under 5KB gzipped
- Testing: Visual regression + accessibility testing
