# Design Guidelines & Design Tokens

This document defines the design system, design tokens, and styling guidelines for creating consistent, themed applications.

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Typography](#typography)
3. [Colors](#colors)
4. [Spacing](#spacing)
5. [Borders & Radius](#borders--radius)
6. [Shadows](#shadows)
7. [Transitions & Animations](#transitions--animations)
8. [Component Patterns](#component-patterns)
9. [Layout Guidelines](#layout-guidelines)
10. [Usage Examples](#usage-examples)

---

## Design Tokens

All design tokens are defined as CSS custom properties (CSS variables) in `globals.css` and extended in `tailwind.config.ts` for use throughout the application.

### Implementation

Design tokens are accessible via:
- **CSS Variables**: `var(--token-name)`
- **Tailwind Classes**: Custom classes defined in `tailwind.config.ts`

---

## Typography

### Font Family

**Primary Font**: Lato

```css
--sidebar-font-family: "Lato"
```

**Font Weights Available**:
- 100 (Thin)
- 300 (Light)
- 400 (Regular/Normal)
- 700 (Bold)
- 900 (Black)

### Font Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `text-xs` | 12px | Small labels, captions |
| `text-sm` | 14px | Body text, descriptions |
| `text-base` | 16px | Default body text, inputs |
| `text-lg` | 18px | Section titles, emphasized text |
| `text-xl` | 20px | Subheadings |
| `text-2xl` | 24px | Page headings |
| `text-3xl` | 30px | Large headings |
| `text-4xl` | 32px | Hero text, major headings |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `font-light` | 300 | Subtle text, placeholders |
| `font-normal` | 400 | Default body text |
| `font-medium` | 500 | Emphasized text, labels |
| `font-semibold` | 600 | Headings, important text |
| `font-bold` | 700 | Strong emphasis, titles |

### Line Heights

Default line heights follow Tailwind's standard scale. Use `leading-tight` for headings and `leading-normal` for body text.

---

## Colors

### Primary Colors (Brand Identity)

| Token | Hex | Usage |
|-------|-----|-------|
| `--sidebar-item-selected` | `#00B2A1` | Primary actions, selected states, links |
| Primary Hover | `#009688` | Hover state for primary actions |
| `--sidebar-fav-text` | `#00F5DC` | Accent text, favorites |

**Tailwind Classes**: `bg-[#00B2A1]`, `text-[#00B2A1]`, `hover:bg-[#009688]`

### Sidebar Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--sidebar-background` | `#3B4154` | Sidebar background |
| `--sidebar-background-hover` | `#656D86` | Sidebar item hover state |
| `--sidebar-border` | `#666F8F` | Sidebar borders, dividers |

### Neutral Colors

#### Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#FFFFFF` | Primary background |
| `--data-preview-tabs-selector-bg` | `#F4F5F6` | Secondary background, input backgrounds |
| Background Light | `#FAFCFF` | Page backgrounds |
| Background Gray | `#F6F8FA` | Section backgrounds |

#### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--foreground` | `#000000` | Primary text |
| Primary Text | `#3B4154` | Headings, primary content |
| Secondary Text | `#333333` | Body text, descriptions |
| Tertiary Text | `#666F8F` | Labels, helper text |
| Muted Text | `#666666` | Secondary information |
| Light Text | `#B0B0B0` | Placeholders, disabled text |

#### Border Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--border-color` | `#CFD2DE` | Standard borders |
| Border Light | `#E4E4E4` | Card borders, dividers |
| Border Muted | `#B0B0B0` | Subtle borders |

### Status Colors

#### Project Status

| Status | Background | Text |
|--------|------------|------|
| Draft | `#888FAA` | `#FFFFFF` |
| Hold | `#CFD2DE` | `#666F8F` |
| In-process | `#EAA23B` | `#3B4154` |
| Operational | `#018E42` | `#FFFFFF` |

#### Alert/Priority Levels

| Level | Background | Text |
|-------|------------|------|
| Critical | `#FEE2E1` | `#DC2625` |
| High | `#FFEDD5` | `#9A3413` |
| Medium | `#FEF9C3` | `#854D0F` |
| Low | `#DCFCE7` | `#018E42` |

#### System Status

| Status | Background | Text | Indicator |
|--------|------------|------|-----------|
| Active/Online | `#DCFCE7` | `#018E42` | `#018E42` |
| Inactive/Offline | `#FEE2E1` | `#DC2625` | `#DC2625` |
| Success | `#DCFCE7` | `#018E42` | - |
| Error | `#FEE2E1` | `#DC2625` | - |
| Warning | `#FFEDD5` | `#9A3413` | - |
| Pending | `#FEF9C3` | `#854D0F` | - |

### Chart/Visualization Colors

Used for file types, categories, and data visualization:

| Color | Hex | Usage |
|-------|-----|-------|
| Turquoise | `#56BDC5` | Charts, file types |
| Purple | `#8F89F3` | Charts, file types |
| Dark Blue | `#3E64B8` | Charts, file types |
| Blue | `#427EE3` | Charts, file types |
| Orange | `#DB8B39` | Charts, file types |
| Beige | `#D8C595` | Charts, file types |
| Dark Teal | `#2D6664` | Charts, file types |
| Brown | `#7B5556` | Charts, file types |

### Semantic Colors (Tailwind)

Use Tailwind's semantic color classes where appropriate:
- `text-gray-500`, `bg-gray-50`, etc.
- `text-teal-500`, `bg-teal-50`, etc.
- `text-red-500`, `bg-red-100`, etc.
- `text-green-500`, `bg-green-100`, etc.
- `text-yellow-500`, `bg-yellow-100`, etc.

---

## Spacing

Spacing follows Tailwind's standard scale (4px base unit).

### Padding & Margins

| Token | Value | Usage |
|-------|-------|-------|
| `p-2` | 8px | Tight spacing, tags |
| `p-3` | 12px | Compact components |
| `p-4` | 16px | Standard card padding |
| `p-6` | 24px | Section padding, large cards |
| `p-8` | 32px | Page padding, spacious cards |

### Gaps (Flexbox/Grid)

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight spacing between icons |
| `gap-2` | 8px | Standard icon/text spacing |
| `gap-3` | 12px | Component spacing |
| `gap-4` | 16px | Section spacing |
| `gap-6` | 24px | Large section spacing |
| `gap-8` | 32px | Major section spacing |

### Component-Specific Spacing

| Component | Padding | Notes |
|-----------|---------|-------|
| Button | `px-4 py-2` (default), `px-6 py-2` (primary) | Standard buttons |
| Input | `px-3 py-2` | Text inputs |
| Card | `p-4` to `p-8` | Varies by card type |
| Sidebar Item | `px-4 py-2` | Navigation items |
| Header | `px-4 py-3` | Top navigation |

---

## Borders & Radius

### Border Width

| Token | Value | Usage |
|-------|-------|-------|
| `border` | 1px | Standard borders |
| `border-2` | 2px | Emphasis, buttons |
| `border-b-2` | 2px bottom | Section dividers |
| `.thin-border` | 0.5px | Subtle dividers |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 2px | Subtle rounding |
| `rounded` | 4px | Default, buttons, inputs |
| `rounded-md` | 6px | Cards, components |
| `rounded-lg` | 8px | Large cards, containers |
| `rounded-xl` | 12px | Feature cards |
| `rounded-full` | 9999px | Pills, badges, avatars |

**Specific Values**:
- `rounded-[4px]`: Explicit 4px (used for inputs, buttons)
- `rounded-[16px]`: Badge pills

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | Subtle elevation |
| `shadow` | `0 1px 3px 0 rgba(0, 0, 0, 0.1)` | Default cards |
| `shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1)` | Elevated cards, hover states |
| `shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1)` | Modals, dropdowns |
| `shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1)` | Maximum elevation |

**Custom Shadow**:
- `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)`: Iframe containers

---

## Transitions & Animations

### Transition Duration

| Token | Value | Usage |
|-------|-------|-------|
| `duration-200` | 200ms | Standard interactions (hover, focus) |
| `duration-300` | 300ms | Smooth transitions (sidebar, modals) |

### Transition Types

- `transition-colors`: Color changes (buttons, links)
- `transition-shadow`: Shadow changes (cards on hover)
- `transition-all`: Multiple properties

### Animations

```css
/* Fade in animation */
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Usage**: Tab content, modal appearances, page transitions

---

## Component Patterns

### Buttons

#### Primary Button
```tsx
className="bg-[#00B2A1] text-white hover:bg-[#009688] 
           px-6 py-2 rounded font-medium 
           transition-colors duration-200 
           focus:outline-none focus:ring-2 focus:ring-teal-500"
```

**Variants**:
- **Primary**: Teal background, white text
- **Secondary**: White background, teal border and text
- **Tertiary**: White background, gray border and text
- **Ghost**: Transparent background, teal text
- **Outline**: Border with teal text, fills on hover

**Sizes**:
- Small: `h-8 px-3 text-xs`
- Default: `h-9 px-4 py-2`
- Large: `h-10 px-8`

#### Button States
- **Default**: Primary color
- **Hover**: Darker shade (10-15% darker)
- **Focus**: Ring outline (2px, teal-500)
- **Disabled**: `opacity-50`, `disabled:pointer-events-none`

### Input Fields

```tsx
className="w-full border border-[#CFD2DE] rounded-[4px] 
           text-[#3B4154] text-sm px-3 py-2 
           focus:border-[#00B2A1] focus:outline-none 
           placeholder-gray-500 h-[35px]"
```

**Characteristics**:
- Border: `#CFD2DE`
- Focus border: `#00B2A1` (primary)
- Height: 35px (standard), 44px (large)
- Padding: `px-3 py-2`
- Placeholder: `text-gray-500`

### Cards

```tsx
className="bg-white border border-gray-200 rounded-lg 
           shadow-sm p-4 hover:shadow-md 
           transition-shadow duration-200"
```

**Variants**:
- **Standard**: White background, subtle shadow
- **Hoverable**: Increases shadow on hover
- **Bordered**: Clear border definition
- **Padding**: `p-4` (standard), `p-6` (large), `p-8` (spacious)

### Badges/Tags

```tsx
// Status Badge
className="px-3 py-1 text-sm bg-[#FEE2E1] text-[#DC2625] 
           rounded-[16px] inline-flex items-center gap-1"
```

**Sizes**:
- Small: `px-2 py-1 text-xs`
- Medium: `px-3 py-1.5 text-sm`
- Large: `px-4 py-2 text-base`

**Common Variants**:
- Critical: Red background/text
- Warning: Yellow background/amber text
- Success: Green background/text
- Info: Teal/blue background/text

### Status Indicators

```tsx
// Dot indicator
<span className="w-2 h-2 rounded-full mr-1" 
      style={{ backgroundColor: statusColor }} />
```

---

## Layout Guidelines

### Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets, mobile menu breakpoint |
| `lg` | 1024px | Desktops |
| `xl` | 1280px | Large desktops |

### Container Widths

- **Full Width**: `w-full`
- **Max Width**: Use `max-w-*` utilities as needed
- **Sidebar**: 
  - Collapsed: `80px`
  - Expanded: `220px`
- **Main Content**: Adapts with `ml-[80px]` or `ml-[220px]`

### Grid Systems

- **Standard Grid**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- **Card Grid**: `grid grid-cols-1 md:grid-cols-4 gap-4`
- **Flex Layout**: `flex flex-col md:flex-row gap-4`

### Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| Base | 0 | Default |
| Dropdown | 10 | Dropdown menus |
| Sticky | 10 | Sticky headers |
| Overlay | 50 | Modals, drawers |
| Toast | 100 | Toast notifications |

---

## Usage Examples

### Creating a Themed Button

```tsx
<button className="bg-[#00B2A1] text-white hover:bg-[#009688] 
                  px-6 py-2 rounded font-medium 
                  transition-colors duration-200 
                  focus:outline-none focus:ring-2 focus:ring-teal-500">
  Primary Action
</button>
```

### Creating a Status Badge

```tsx
<span className="px-3 py-1 text-sm bg-[#DCFCE7] text-[#018E42] 
                rounded-[16px] inline-flex items-center gap-1">
  <span className="w-2 h-2 rounded-full bg-[#018E42]" />
  Active
</span>
```

### Creating a Card Component

```tsx
<div className="bg-white border border-gray-200 rounded-lg 
                shadow-sm p-6 hover:shadow-md 
                transition-shadow duration-200">
  <h3 className="text-lg font-semibold text-[#3B4154] mb-2">
    Card Title
  </h3>
  <p className="text-sm text-[#666F8F]">
    Card description text
  </p>
</div>
```

### Creating an Input Field

```tsx
<input
  type="text"
  className="w-full border border-[#CFD2DE] rounded-[4px] 
             text-[#3B4154] text-sm px-3 py-2 
             focus:border-[#00B2A1] focus:outline-none 
             placeholder-gray-500 h-[35px]"
  placeholder="Enter text..."
/>
```

### Creating a Priority Alert

```tsx
<div className={`px-3 py-2 rounded-md flex items-center gap-2 ${
  priority === 'Critical' ? 'bg-[#FEE2E1] text-[#DC2625]' :
  priority === 'High' ? 'bg-[#FFEDD5] text-[#9A3413]' :
  'bg-[#FEF9C3] text-[#854D0F]'
}`}>
  <AlertIcon className="w-4 h-4" />
  {priority} Priority
</div>
```

---

## Best Practices

1. **Consistency**: Always use design tokens instead of hardcoded values
2. **Accessibility**: Ensure sufficient color contrast (WCAG AA minimum)
3. **Responsive**: Design mobile-first, then enhance for larger screens
4. **Performance**: Use CSS transitions for smooth interactions
5. **Semantic Colors**: Use status colors consistently across the application
6. **Typography**: Maintain consistent font weights and sizes for hierarchy
7. **Spacing**: Use the spacing scale for consistent layouts
8. **States**: Always define hover, focus, active, and disabled states

---

## Theme Customization

To create a new theme using these guidelines:

1. **Update CSS Variables**: Modify values in `globals.css`
2. **Update Tailwind Config**: Extend colors in `tailwind.config.ts`
3. **Maintain Ratios**: Keep color relationships consistent
4. **Test Contrast**: Verify accessibility with new colors
5. **Document Changes**: Update this guide with new token values

---

## File References

- **CSS Variables**: `src/app/globals.css`
- **Tailwind Config**: `tailwind.config.ts`
- **Component Examples**: `src/components/ui/`, `src/components/threads-ui/`

