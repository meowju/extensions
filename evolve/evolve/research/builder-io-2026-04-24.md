=== Research: Builder.io / Zemith ===

Date: 2026-04-24

== What It Does ==

Builder.io is a visual CMS and page builder that has evolved into an AI-powered component generation platform. Their system allows developers to:

- Generate web pages by composing AI-generated React components
- Use natural language to describe desired UI components
- Integrate custom components into the visual builder
- Iterate on designs through conversational AI

Zemith is Builder.io's approach to AI-native component generation - using LLMs to understand design intent and generate production-ready React code.

== How It Works ==

**Component Generation Pipeline**

1. **Natural Language Input**: User describes what they want in plain English
2. **Design Intent Understanding**: LLM parses the request for layout, style, and behavior
3. **Component Code Generation**: Generates React/HTML code matching the description
4. **Visual Preview**: Renders the component in the Builder.io visual editor
5. **Iterative Refinement**: User can request changes, AI regenerates

**Key Technical Patterns**

- **Component Registry**: Maintains a library of base components the AI can compose
- **Design Token System**: Uses CSS variables for consistent theming
- **React-based Rendering**: Generated components are React components
- **Component Handoff**: Designers and developers can collaborate on generated components
- **Code Export**: Export generated components as standalone React code

**AI Integration**

Builder.io uses a hybrid approach:
1. Template-based components for common patterns
2. LLM-generated code for custom layouts
3. Post-generation validation to ensure valid React

== What Meow Should Steal ==

### 1. Component Registry for Skills
Meow could maintain a registry of "skill components" - common task templates that can be composed. Instead of generating everything from scratch, the AI can assemble skills from known patterns.

### 2. Iterative Refinement Loop
Like Builder.io, Meow should support "refine" commands:
```
/refine: Make the code more defensive
/refine: Add error handling
/refine: Use TypeScript interfaces
```

### 3. Design Token Awareness
Builder.io uses design tokens (CSS variables) for consistency. Meow could adopt similar patterns:
- Standard variable names for project conventions
- Awareness of existing styling patterns
- Code that respects the project's design system

### 4. Component Handoff Pattern
Builder.io enables seamless handoff from AI to developer. Meow could:
- Generate code that matches project's existing patterns
- Follow established file organization
- Respect project's coding conventions

### 5. Visual Preview for Complex Outputs
When Meow generates complex UI components or visualizations, it could:
- Offer to render a preview (if terminal supports)
- Generate mock data for preview
- Show before/after for refactoring tasks

## What Meow Should Avoid ==

### 1. Over-Engineering the Generator
Builder.io's component generator is complex. For Meow:
- Keep skill generation simpler
- Focus on task completion, not visual perfection
- Don't try to be a full IDE

### 2. Assuming Visual Context
Builder.io assumes a visual design environment. Meow:
- Works in terminal/code environment
- Should focus on code generation, not visual generation
- Don't force visual paradigms onto terminal workflows

### 3. Lock-in to Specific Framework
Builder.io outputs React. Meow should:
- Support multiple output formats
- Ask user for preferred language/framework
- Be flexible, not opinionated without user input

## Next Steps ==

1. **Add /refine command** - Allow users to iteratively improve outputs
2. **Component pattern library** - Build a library of common task patterns
3. **Design token awareness** - Detect and respect project conventions
4. **Export formats** - Support multiple output languages/frameworks

## Sources ==

1. https://www.builder.io/blog/ai-components
2. https://www.builder.io/codegen
3. Builder.io documentation on component generation
