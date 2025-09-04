---
description: UI Validation and Visual Testing with Playwright MCP
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# UI Validation with Playwright MCP

## Overview

Use Playwright MCP server for comprehensive UI testing, visual validation, and accessibility audits in water infrastructure monitoring system.

<pre_flight_check>
  EXECUTE: @.agent-os/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="development_server_validation">

### Step 1: Development Server Validation

Ensure development servers are running before UI validation.

<server_requirements>
  <web_dashboard>
    - Next.js development server: http://localhost:3000
    - Ensure water infrastructure dashboard is accessible
    - Verify authentication system is functional
  </web_dashboard>
  <mobile_app>
    - React Native Expo server: http://localhost:8081
    - Ensure mobile app preview is available
    - Verify offline-first functionality demo
  </mobile_app>
</server_requirements>

<validation_command>
  playwright-mcp: "Check development server status at http://localhost:3000"
  playwright-mcp: "Verify mobile app preview at http://localhost:8081"
</validation_command>

</step>

<step number="2" name="responsive_design_testing">

### Step 2: Responsive Design Testing

Test water infrastructure UI across different device viewports.

<viewport_testing>
  <mobile_devices>
    - iPhone 14 Pro (393x852) - Field staff mobile usage
    - Galaxy S21 (360x800) - Android field staff
    - iPad Mini (768x1024) - Supervisor tablet usage
  </mobile_devices>
  <desktop_viewports>
    - MacBook Air (1366x768) - Manager dashboard
    - Desktop (1920x1080) - Admin full dashboard
    - Ultrawide (2560x1440) - Multi-project monitoring
  </desktop_viewports>
</viewport_testing>

<testing_commands>
  playwright-mcp: "Screenshot comparison for mobile navigation menu"
  playwright-mcp: "Test responsive map interface on tablet viewport"
  playwright-mcp: "Validate desktop dashboard layout with sidebar"
  playwright-mcp: "Test form inputs on mobile viewport for field data entry"
</testing_commands>

</step>

<step number="3" name="water_infrastructure_ui_validation">

### Step 3: Water Infrastructure Specific UI Testing

Test UI components specific to water infrastructure monitoring.

<infrastructure_components>
  <map_interface>
    - KML file visualization
    - Location pinning functionality
    - Color-coded progress indicators
    - Zoom and pan interactions
  </map_interface>
  <data_entry_forms>
    - Pipe measurement forms
    - Borewell depth entry
    - Motor specifications input
    - Photo upload validation
  </data_entry_forms>
  <progress_dashboards>
    - Village-wise progress charts
    - Component completion status
    - Real-time data updates
    - Export report functionality
  </progress_dashboards>
</infrastructure_components>

<validation_scenarios>
  playwright-mcp: "Test KML file upload and map visualization"
  playwright-mcp: "Validate infrastructure component data entry forms"
  playwright-mcp: "Screenshot progress dashboard with sample data"
  playwright-mcp: "Test photo upload functionality with validation"
  playwright-mcp: "Validate color-coded map markers for completion status"
</validation_scenarios>

</step>

<step number="4" name="accessibility_audit">

### Step 4: Accessibility Audit for Water Infrastructure System

Ensure WCAG 2.1 AA compliance for field staff, supervisors, and administrators.

<accessibility_requirements>
  <field_staff_needs>
    - Large touch targets for mobile data entry
    - High contrast for outdoor usage
    - Simple navigation for quick data entry
    - Voice input support for hands-free operation
  </field_staff_needs>
  <supervisor_manager_needs>
    - Keyboard navigation for dashboard efficiency
    - Screen reader support for reports
    - Focus management in modal dialogs
    - Alternative text for chart visualizations
  </supervisor_manager_needs>
</accessibility_requirements>

<audit_commands>
  playwright-mcp: "Run accessibility audit on main dashboard"
  playwright-mcp: "Test keyboard navigation through data entry forms"
  playwright-mcp: "Validate screen reader support for progress charts"
  playwright-mcp: "Check color contrast for map markers and indicators"
  playwright-mcp: "Test focus management in photo upload modals"
</audit_commands>

</step>

<step number="5" name="user_flow_testing">

### Step 5: Critical User Flow Testing

Test complete user workflows for water infrastructure monitoring.

<critical_flows>
  <field_staff_workflow>
    1. Login with field staff credentials
    2. Select assigned village/project
    3. Navigate to infrastructure component location
    4. Enter measurement data (pipe size, depth, etc.)
    5. Upload photos as validation
    6. Submit data and sync to server
  </field_staff_workflow>
  
  <supervisor_workflow>
    1. Login to web dashboard
    2. Review submitted field data
    3. Validate photos and measurements
    4. Approve or reject submissions
    5. Assign new tasks by pinning locations on map
    6. Generate progress reports
  </supervisor_workflow>
  
  <manager_workflow>
    1. Access multi-project dashboard
    2. Review village-wise progress
    3. Analyze completion statistics
    4. Export one-page town reports
    5. Monitor real-time data updates
  </manager_workflow>
</critical_flows>

<flow_testing_commands>
  playwright-mcp: "Test complete field staff data entry workflow"
  playwright-mcp: "Validate supervisor approval workflow with photo review"
  playwright-mcp: "Test manager dashboard with multi-project navigation"
  playwright-mcp: "Validate real-time data synchronization from mobile to web"
</flow_testing_commands>

</step>

<step number="6" name="visual_regression_testing">

### Step 6: Visual Regression Testing

Compare current UI state with approved designs for consistency.

<visual_comparison_areas>
  <component_states>
    - Button hover and active states
    - Form validation error states
    - Loading states for data fetching
    - Empty states for no data scenarios
  </component_states>
  <layout_consistency>
    - Header and navigation consistency
    - Sidebar layout across pages
    - Card component spacing and alignment
    - Table formatting and pagination
  </layout_consistency>
</visual_comparison_areas>

<regression_commands>
  playwright-mcp: "Screenshot comparison for all button states"
  playwright-mcp: "Compare form validation error displays"
  playwright-mcp: "Validate loading spinner consistency across pages"
  playwright-mcp: "Screenshot infrastructure progress cards layout"
</regression_commands>

</step>

<step number="7" name="performance_validation">

### Step 7: UI Performance Validation

Test UI performance with water infrastructure data loads.

<performance_scenarios>
  <data_heavy_scenarios>
    - Loading large village datasets (1000+ infrastructure components)
    - Rendering maps with multiple KML file overlays  
    - Displaying real-time data updates from multiple field teams
    - Generating reports with extensive photo galleries
  </data_heavy_scenarios>
  <network_conditions>
    - Slow 3G (field connectivity simulation)
    - Fast 3G (typical mobile connectivity)
    - WiFi (office environment)
    - Offline mode (field areas without connectivity)
  </network_conditions>
</performance_scenarios>

<performance_commands>
  playwright-mcp: "Test page load performance with large datasets"
  playwright-mcp: "Validate map rendering performance with multiple KML files"
  playwright-mcp: "Test real-time updates performance with simulated slow network"
  playwright-mcp: "Validate offline mode functionality and data sync"
</performance_commands>

</step>

<step number="8" name="cross_browser_testing">

### Step 8: Cross-Browser Compatibility Testing

Ensure compatibility across browsers used by different user types.

<browser_matrix>
  <field_staff_browsers>
    - Chrome Mobile (Android devices)
    - Safari Mobile (iOS devices) 
    - Samsung Internet (Samsung devices)
  </field_staff_browsers>
  <supervisor_manager_browsers>
    - Chrome Desktop (primary)
    - Firefox Desktop (alternative)
    - Safari Desktop (Mac users)
    - Edge Desktop (Windows users)
  </supervisor_manager_browsers>
</browser_matrix>

<cross_browser_commands>
  playwright-mcp: "Test water infrastructure dashboard in Chrome and Firefox"
  playwright-mcp: "Validate mobile app functionality across mobile browsers"
  playwright-mcp: "Test KML file upload in Safari and Edge browsers"
  playwright-mcp: "Compare form rendering across all supported browsers"
</cross_browser_commands>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.agent-os/instructions/meta/post-flight.md
</post_flight_check>