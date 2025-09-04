# Design Systems Standards

## Overview

Design systems ensure consistent UI/UX across Agent OS projects. This document defines the standard design system approach, component libraries, and design tokens for different technology stacks.

## Design System Architecture

### Design Tokens
- **Colors**: Primary, secondary, semantic colors (success, warning, error)
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Consistent spacing scale (4px, 8px, 16px, 24px, 32px, 48px, 64px)
- **Shadows**: Elevation system for depth and hierarchy
- **Border Radius**: Consistent corner radius values
- **Breakpoints**: Responsive design breakpoints

### Component Hierarchy
```
Design System
├── Tokens (colors, typography, spacing)
├── Base Components (Button, Input, Card)
├── Composite Components (Form, Modal, Table)
├── Layout Components (Grid, Container, Stack)
└── Page Templates (Dashboard, Settings, Auth)
```

## Technology Stack Integration

### React + TypeScript Projects
- **Primary**: Shadcn/ui + Tailwind CSS
- **Tokens**: CSS custom properties + Tailwind config
- **Components**: TypeScript interfaces for props
- **Documentation**: Storybook integration

### React Native Projects
- **Primary**: NativeBase or React Native Elements
- **Tokens**: JavaScript/TypeScript theme objects
- **Components**: Styled with theme provider
- **Platform**: iOS/Android specific adaptations

### Ruby on Rails Projects
- **Primary**: ViewComponent + Tailwind CSS
- **Tokens**: SCSS variables + Tailwind config
- **Components**: Ruby view components
- **Stimulus**: JavaScript behavior integration

## Component Standards

### Base Component Requirements
```yaml
button:
  variants: [primary, secondary, outline, ghost, destructive]
  sizes: [sm, md, lg, xl]
  states: [default, hover, active, disabled, loading]
  accessibility: WCAG 2.1 AA compliant

input:
  types: [text, email, password, number, search]
  states: [default, focus, error, disabled]
  validation: Built-in error display
  accessibility: Proper labeling and ARIA

card:
  variants: [default, bordered, elevated]
  sections: [header, content, footer]
  responsive: Mobile-first design
```

### Design Token Implementation

#### Tailwind CSS Configuration
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  }
}
```

#### CSS Custom Properties
```css
:root {
  --color-primary-500: #3b82f6;
  --spacing-4: 1rem;
  --border-radius-md: 0.375rem;
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

## Design System Workflows

### Component Development Process
1. **Design Review**: Figma/design file analysis
2. **Token Extraction**: Identify reusable design tokens
3. **Component Implementation**: Build with accessibility
4. **Documentation**: Props, variants, usage examples
5. **Testing**: Visual regression and accessibility tests

### Design System Integration in Tasks

#### In `execute-task.md`
```yaml
design_system_integration:
  step_2_tech_spec:
    - Check design system compatibility
    - Identify required components
  step_5_implementation:
    - Use design system components
    - Follow design token standards
    - Implement responsive behavior
```

#### In `create-spec.md`
```yaml
design_considerations:
  component_selection:
    - Map features to design system components
    - Identify custom component needs
  responsive_design:
    - Mobile-first approach
    - Breakpoint usage
  accessibility:
    - WCAG 2.1 compliance
    - Keyboard navigation
```

## Quality Standards

### Accessibility Requirements
- **WCAG 2.1 AA**: Minimum compliance level
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader**: Proper ARIA labels and roles
- **Color Contrast**: 4.5:1 minimum ratio
- **Focus Management**: Visible focus indicators

### Performance Standards
- **Bundle Size**: Components under 5KB gzipped
- **Runtime Performance**: No layout thrashing
- **Loading States**: Skeleton screens for async content
- **Image Optimization**: Responsive images with proper formats

### Testing Requirements
```yaml
component_testing:
  unit_tests:
    - Props validation
    - Event handling
    - State management
  visual_regression:
    - Screenshot comparison
    - Cross-browser testing
  accessibility_tests:
    - Automated a11y testing
    - Screen reader testing
```

## Design System Maintenance

### Version Management
- **Semantic Versioning**: Major.Minor.Patch
- **Breaking Changes**: Major version updates
- **New Components**: Minor version updates
- **Bug Fixes**: Patch version updates

### Documentation Requirements
- **Component API**: Props, methods, events
- **Usage Examples**: Common use cases
- **Design Guidelines**: When and how to use
- **Migration Guides**: Version upgrade paths

## Project-Specific Customization

### Theme Customization
```yaml
customization_levels:
  tokens_only:
    - Override colors, fonts, spacing
    - Keep component structure
  component_variants:
    - Add new component variants
    - Extend existing components
  custom_components:
    - Build project-specific components
    - Extend design system
```

### Brand Integration
- **Logo Integration**: Consistent logo usage
- **Brand Colors**: Primary/secondary color mapping
- **Typography**: Brand font integration
- **Iconography**: Consistent icon style

## Integration with MCP Servers

### Design Asset Management
- **mcp-server-filesystem**: Manage design assets
- **mcp-server-fetch**: Fetch design tokens from external sources
- **mcp-server-git**: Version control for design files

### Automated Design Updates
- **Token Sync**: Automated design token updates from Figma
- **Component Generation**: Generate components from design specs
- **Asset Optimization**: Automated image and icon optimization