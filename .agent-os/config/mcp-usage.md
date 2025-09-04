# MCP Server Usage Guidelines - Neer Thuli Project

## Project-Specific MCP Integration

### Enabled MCP Servers (Priority Order)

#### 1. Context7 Documentation Server 🔍
- **Purpose**: Latest documentation for Next.js 15, Tailwind CSS 4, React 19, TypeScript 5.x, Supabase, Expo
- **Use Cases**: 
  - API reference lookup during development
  - Migration guides for framework updates
  - Best practices and implementation examples
  - Code snippets and patterns
- **When to Use**: Before implementing any feature, for API questions, framework updates

#### 2. Supabase MCP Server 🗄️
- **Purpose**: Real-time database operations and monitoring for water infrastructure data
- **Use Cases**:
  - Query project, village, and infrastructure data
  - Validate data relationships (projects → villages → components)
  - Monitor real-time updates from mobile app
  - Manage user authentication and roles
  - Test file uploads for photos/documents
- **When to Use**: Database operations, data validation, testing mobile app sync

#### 3. Playwright MCP Server 🎭
- **Purpose**: Browser automation and visual testing for both mobile and web apps
- **Use Cases**:
  - Open development server (Next.js web dashboard)
  - Visual regression testing for UI components
  - Test responsive design (mobile, tablet, desktop)
  - Accessibility audits for WCAG compliance
  - User flow testing (login, data entry, report generation)
- **When to Use**: UI development, visual validation, accessibility testing

#### 4. Shadcn MCP Server 🎨
- **Purpose**: Component library integration and customization assistance
- **Use Cases**:
  - Browse available Shadcn/ui components for features
  - Get implementation examples for forms, tables, modals
  - Customize components for water infrastructure theme
  - Integration guidance with Tailwind CSS 4
  - Accessibility patterns for components
- **When to Use**: UI component selection, implementation guidance, theming

#### 5. Standard MCP Servers 🔧
- **Filesystem**: Bulk file operations, template management
- **Git**: Repository analysis, branch management
- **Fetch**: External API integrations (if needed)

## Water Infrastructure Project Usage Patterns

### During Feature Development

#### 1. Research Phase
```bash
# Use Context7 for latest Next.js 15 features
context7: "Next.js 15 server actions with TypeScript"
context7: "Tailwind CSS 4 configuration with Next.js"
context7: "Supabase real-time subscriptions with React"
```

#### 2. Database Design Phase
```bash
# Use Supabase MCP for schema validation
supabase-mcp: "Show tables and relationships"
supabase-mcp: "Query infrastructure_components for pipe data"
supabase-mcp: "Test user authentication with field_staff role"
```

#### 3. UI Development Phase
```bash
# Use Shadcn MCP for component selection
shadcn-mcp: "Show form components with validation"
shadcn-mcp: "Table component with sorting and filtering"
shadcn-mcp: "Modal component for photo upload"

# Use Context7 for implementation guidance
context7: "React Hook Form with Zod validation in Next.js 15"
context7: "Tailwind CSS 4 responsive design patterns"
```

#### 4. Testing Phase
```bash
# Use Playwright MCP for visual validation
playwright-mcp: "Open localhost:3000 and test mobile navigation"
playwright-mcp: "Screenshot comparison for component states"
playwright-mcp: "Accessibility audit for form components"
```

### Specific Use Case Examples

#### Mobile App Data Entry Form
1. **Context7**: "React Native form validation with AsyncStorage"
2. **Shadcn MCP**: "Input components with error states"
3. **Supabase MCP**: "Test data sync from mobile to web dashboard"
4. **Playwright MCP**: "Test responsive form on mobile viewport"

#### Web Dashboard KML Map Integration
1. **Context7**: "Leaflet.js integration with Next.js 15"
2. **Context7**: "KML file parsing in JavaScript"
3. **Supabase MCP**: "Query location data with GPS coordinates"
4. **Playwright MCP**: "Test map interactions and marker placement"

#### One-Page Town Reports
1. **Context7**: "PDF generation in Next.js with jsPDF"
2. **Shadcn MCP**: "Table and card components for report layout"
3. **Supabase MCP**: "Aggregate project progress data by village"
4. **Playwright MCP**: "Test PDF generation and download functionality"

## Integration Workflow

### Step-by-Step Development Process

1. **📚 Research** → Use `context7` for latest docs and best practices
2. **🗄️ Database** → Use `supabase-mcp` to validate data and test queries
3. **🎨 UI Design** → Use `shadcn-mcp` for component selection and theming
4. **💻 Implementation** → Use `context7` for coding guidance and examples
5. **🎭 Testing** → Use `playwright-mcp` for visual and functional testing
6. **🔧 Operations** → Use standard MCP servers for file/git operations

### Error Handling and Fallbacks

If specialized MCP servers are unavailable:
1. Fall back to `context7` for documentation lookup
2. Use standard tools for database operations
3. Use manual browser testing instead of Playwright
4. Use Shadcn documentation website for component reference

## Environment Setup

### Required Environment Variables
```bash
# Context7 API key for documentation access
CONTEXT7_API_KEY=ctx7sk-2c838b9b-54f7-42a9-a250-25f08052104b

# Supabase credentials
SUPABASE_URL=https://rmwvhfmootqzcxjgblsq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtd3ZoZm1vb3RxemN4amdibHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3Nzc1NSwiZXhwIjoyMDcyNTUzNzU1fQ.wC7sDdjQQvyUxNVJEvWqXVsaCxjTXgJ_AI_8dNIVgyM
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtd3ZoZm1vb3RxemN4amdibHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5Nzc3NTUsImV4cCI6MjA3MjU1Mzc1NX0.erc-UyHsJjxf6_a2oQAk5Q3p2BqGW0nzam62FlZvKRA
```

### Development Server Requirements
- Next.js development server running on `http://localhost:3000`
- React Native Expo server running on `http://localhost:8081`
- Supabase project accessible and configured