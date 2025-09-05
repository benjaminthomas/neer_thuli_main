---
description: Design System Setup and Integration Workflow for Agent OS
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Design System Setup Workflow

## Overview

Establish design system standards and component integration for consistent UI/UX across Agent OS projects.

<pre_flight_check>
  EXECUTE: @.agent-os/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="analyze_ui_requirements">

### Step 1: Analyze UI Requirements

Use the context-fetcher subagent to analyze the project's UI/UX requirements from the product specifications and roadmap.

<analysis_areas>
  <component_needs>
    - Identify required UI components from specs
    - Map features to design system components
    - Identify custom component requirements
  </component_needs>
  <responsive_requirements>
    - Mobile-first design needs
    - Tablet and desktop considerations
    - Breakpoint requirements
  </responsive_requirements>
  <accessibility_needs>
    - WCAG compliance requirements
    - Keyboard navigation needs
    - Screen reader compatibility
  </accessibility_needs>
  <performance_targets>
    - Bundle size constraints
    - Loading performance requirements
    - Runtime performance needs
  </performance_targets>
</analysis_areas>

<instructions>
  ACTION: Use context-fetcher subagent
  REQUEST: "Analyze UI requirements from project specs:
            - Required components from roadmap features
            - Responsive design needs for target devices
            - Accessibility requirements for user types
            - Performance constraints from tech stack"
  PROCESS: Returned UI analysis
  IDENTIFY: Design system requirements and customizations
</instructions>

</step>

<step number="2" subagent="file-creator" name="create_design_config">

### Step 2: Create Design System Configuration

Use the file-creator subagent to create design system configuration and guidelines specific to the project.

<config_structure>
  .agent-os/
  └── design/
      ├── design-tokens.json      # Design tokens configuration
      ├── component-library.md    # Component usage guidelines
      └── accessibility.md        # Accessibility requirements
</config_structure>

<design_tokens_template>
{
  "colors": {
    "primary": {
      "50": "#f0f9ff",
      "500": "#3b82f6", 
      "900": "#1e3a8a"
    },
    "semantic": {
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444"
    }
  },
  "typography": {
    "fontFamily": {
      "sans": ["Inter", "system-ui", "sans-serif"],
      "mono": ["JetBrains Mono", "monospace"]
    },
    "fontSize": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem"
    }
  },
  "spacing": {
    "1": "0.25rem",
    "2": "0.5rem", 
    "4": "1rem",
    "8": "2rem"
  },
  "borderRadius": {
    "sm": "0.125rem",
    "md": "0.375rem",
    "lg": "0.5rem"
  }
}
</design_tokens_template>

</step>

<step number="3" subagent="file-creator" name="create_component_guidelines">

### Step 3: Create Component Usage Guidelines

Use the file-creator subagent to create comprehensive component usage guidelines for the project.

<component_guidelines_template>
# Component Library Guidelines

## Framework Integration

### Monorepo Multi-Platform Components

#### Cross-Platform Component Strategy
- **Web Library:** Shadcn UI with Tailwind CSS (Next.js)
- **Mobile Library:** NativeWind + React Native components (Expo)
- **Shared Package:** @project/ui for common component logic
- **Installation:** Use Shadcn MCP server for component management and examples

#### Primary Component Libraries
- **Web (Next.js):** Shadcn UI + Tailwind CSS
- **Mobile (Expo):** React Native + NativeWind
- **Shared:** @project/ui workspace package

#### Required Components
- **Button:** Primary, secondary, outline, ghost variants
- **Input:** Text, email, password, validation states
- **Card:** Content containers with header/footer
- **Modal:** Dialogs and overlays
- **Table:** Data display with sorting/filtering
- **Form:** Form validation and submission

#### Custom Components
[LIST_PROJECT_SPECIFIC_COMPONENTS]

## Component Usage Patterns

### Button Component
```[FRAMEWORK_SYNTAX]
<Button variant="primary" size="md">
  Primary Action
</Button>
```

### Form Components
```[FRAMEWORK_SYNTAX]
<Form>
  <Input 
    label="Email"
    type="email"
    validation="email"
    required
  />
</Form>
```

## Responsive Design

### Breakpoints
- **Mobile:** 320px - 768px
- **Tablet:** 768px - 1024px  
- **Desktop:** 1024px+

### Mobile-First Approach
- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly interactive elements

## Accessibility Standards

### WCAG 2.1 AA Compliance
- Color contrast ratio 4.5:1 minimum
- Keyboard navigation for all interactive elements
- Screen reader compatible ARIA labels
- Focus indicators for all focusable elements

### Implementation Requirements
- Semantic HTML structure
- Proper heading hierarchy
- Form label associations
- Error message accessibility

</component_guidelines_template>

</step>

<step number="4" subagent="file-creator" name="create_accessibility_guide">

### Step 4: Create Accessibility Guidelines

Use the file-creator subagent to create project-specific accessibility requirements and testing guidelines.

<accessibility_guide_template>
# Accessibility Guidelines

## WCAG 2.1 Compliance Requirements

### Level AA Standards (Minimum)
- **Color Contrast:** 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation:** All functionality accessible via keyboard
- **Screen Reader:** Compatible with assistive technologies
- **Focus Management:** Visible focus indicators required

### Implementation Checklist

#### Forms
- [ ] All inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Required fields are properly indicated
- [ ] Form validation is accessible

#### Navigation
- [ ] Keyboard navigation works throughout application
- [ ] Skip links provided for main content
- [ ] Navigation landmarks are properly marked
- [ ] Tab order is logical and intuitive

#### Content
- [ ] Heading hierarchy is semantic (h1, h2, h3...)
- [ ] Images have appropriate alt text
- [ ] Color is not the only means of conveying information
- [ ] Text can be zoomed to 200% without horizontal scrolling

### Testing Requirements

#### Automated Testing
- Use axe-core for accessibility testing
- Include accessibility tests in CI/CD pipeline
- Minimum 90% accessibility test coverage

#### Manual Testing
- Keyboard-only navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Color contrast validation
- Mobile accessibility testing

### Component Accessibility

#### Buttons
```[FRAMEWORK_SYNTAX]
<Button
  aria-label="Submit form"
  disabled={isLoading}
  aria-describedby={errorId}
>
  Submit
</Button>
```

#### Forms
```[FRAMEWORK_SYNTAX]
<Input
  id="email"
  label="Email Address"
  required
  aria-describedby="email-error"
  aria-invalid={hasError}
/>
```

</accessibility_guide_template>

</step>

<step number="5" name="integration_setup">

### Step 5: Framework Integration Setup

Configure the chosen framework's design system integration based on the project's tech stack.

<framework_integrations>
  <monorepo_setup>
    - Setup shared @project/ui package with cross-platform components
    - Configure Shadcn/ui with Tailwind CSS for Next.js web app
    - Setup NativeWind for React Native Expo mobile app
    - Configure shared design tokens across platforms
    - Setup platform-specific component adaptations
    - Configure Storybook for cross-platform documentation
  </monorepo_setup>
  <web_nextjs>
    - Setup Shadcn/ui components in apps/web
    - Configure Tailwind CSS with shared design tokens
    - Import shared components from @project/ui
    - Setup responsive utilities for web
  </web_nextjs>
  <mobile_expo>
    - Setup NativeWind for styling consistency
    - Configure React Native components with shared theme
    - Import shared logic from @project/ui
    - Setup platform-specific adaptations
  </mobile_expo>
</framework_integrations>

<instructions>
  ACTION: Identify project's primary framework
  CONFIGURE: Framework-specific design system integration
  SETUP: Design tokens and component library
  VALIDATE: Integration works with build system
</instructions>

</step>

<step number="6" name="testing_setup">

### Step 6: Design System Testing Setup

Configure testing infrastructure for design system components and accessibility validation.

<testing_configuration>
  <visual_regression>
    - Use Playwright MCP server for screenshot comparison testing
    - Cross-browser validation with automated testing
    - Component state testing across different viewports
  </visual_regression>
  <accessibility_testing>
    - Use Playwright MCP server for accessibility audits
    - Automated keyboard navigation testing
    - Screen reader compatibility validation
  </accessibility_testing>
  <performance_testing>
    - Bundle size monitoring with performance metrics
    - Runtime performance validation using Playwright
    - Loading performance testing across devices
  </performance_testing>
</testing_configuration>

<instructions>
  ACTION: Setup testing infrastructure
  CONFIGURE: Visual regression and accessibility testing
  INTEGRATE: Testing into CI/CD pipeline
  VALIDATE: All tests pass with sample components
</instructions>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.agent-os/instructions/meta/post-flight.md
</post_flight_check>