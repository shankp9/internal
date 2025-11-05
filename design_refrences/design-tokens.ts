/**
 * Design Tokens
 * 
 * Centralized design tokens for the application.
 * These tokens can be imported and used in TypeScript/JavaScript files,
 * and should be kept in sync with CSS variables in globals.css and tailwind.config.ts
 */

export const designTokens = {
  // ============================================================================
  // Typography
  // ============================================================================
  typography: {
    fontFamily: {
      primary: '"Lato", sans-serif',
      variable: 'var(--sidebar-font-family)',
    },
    fontWeight: {
      thin: 100,
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '32px',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // ============================================================================
  // Colors
  // ============================================================================
  colors: {
    // Primary Brand Colors
    primary: {
      main: '#00B2A1',
      hover: '#009688',
      light: '#00F5DC',
      variable: 'var(--sidebar-item-selected)',
    },

    // Sidebar Colors
    sidebar: {
      background: '#3B4154',
      backgroundHover: '#656D86',
      border: '#666F8F',
      favText: '#00F5DC',
      variables: {
        background: 'var(--sidebar-background)',
        backgroundHover: 'var(--sidebar-background-hover)',
        border: 'var(--sidebar-border)',
        favText: 'var(--sidebar-fav-text)',
        itemSelected: 'var(--sidebar-item-selected)',
      },
    },

    // Neutral Colors - Backgrounds
    background: {
      primary: '#FFFFFF',
      secondary: '#F4F5F6',
      light: '#FAFCFF',
      gray: '#F6F8FA',
      variables: {
        primary: 'var(--background)',
        secondary: 'var(--data-preview-tabs-selector-bg)',
      },
    },

    // Neutral Colors - Text
    text: {
      primary: '#000000',
      heading: '#3B4154',
      body: '#333333',
      label: '#666F8F',
      muted: '#666666',
      light: '#B0B0B0',
      variables: {
        primary: 'var(--foreground)',
      },
    },

    // Neutral Colors - Borders
    border: {
      default: '#CFD2DE',
      light: '#E4E4E4',
      muted: '#B0B0B0',
      variables: {
        default: 'var(--border-color)',
      },
    },

    // Status Colors - Project Status
    status: {
      project: {
        draft: { bg: '#888FAA', text: '#FFFFFF' },
        hold: { bg: '#CFD2DE', text: '#666F8F' },
        'in-process': { bg: '#EAA23B', text: '#3B4154' },
        operational: { bg: '#018E42', text: '#FFFFFF' },
      },

      // Priority/Alert Levels
      priority: {
        critical: { bg: '#FEE2E1', text: '#DC2625' },
        high: { bg: '#FFEDD5', text: '#9A3413' },
        medium: { bg: '#FEF9C3', text: '#854D0F' },
        low: { bg: '#DCFCE7', text: '#018E42' },
      },

      // System Status
      system: {
        active: { bg: '#DCFCE7', text: '#018E42', indicator: '#018E42' },
        inactive: { bg: '#FEE2E1', text: '#DC2625', indicator: '#DC2625' },
        success: { bg: '#DCFCE7', text: '#018E42' },
        error: { bg: '#FEE2E1', text: '#DC2625' },
        warning: { bg: '#FFEDD5', text: '#9A3413' },
        pending: { bg: '#FEF9C3', text: '#854D0F' },
      },
    },

    // Chart/Visualization Colors
    charts: {
      turquoise: '#56BDC5',
      purple: '#8F89F3',
      darkBlue: '#3E64B8',
      blue: '#427EE3',
      orange: '#DB8B39',
      beige: '#D8C595',
      darkTeal: '#2D6664',
      brown: '#7B5556',
      // Array for easy iteration
      palette: [
        '#56BDC5',
        '#8F89F3',
        '#3E64B8',
        '#427EE3',
        '#DB8B39',
        '#D8C595',
        '#2D6664',
        '#7B5556',
      ],
    },
  },

  // ============================================================================
  // Spacing
  // ============================================================================
  spacing: {
    // Base unit is 4px
    unit: 4,
    scale: {
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
    },
    // Component-specific spacing
    components: {
      button: {
        default: { x: '16px', y: '8px' },
        primary: { x: '24px', y: '8px' },
        sm: { x: '12px', y: '8px' },
        lg: { x: '32px', y: '8px' },
      },
      input: {
        default: { x: '12px', y: '8px' },
        height: {
          default: '35px',
          large: '44px',
        },
      },
      card: {
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      sidebarItem: { x: '16px', y: '8px' },
      header: { x: '16px', y: '12px' },
    },
  },

  // ============================================================================
  // Borders & Radius
  // ============================================================================
  borders: {
    width: {
      thin: '0.5px',
      default: '1px',
      thick: '2px',
    },
    radius: {
      none: '0px',
      sm: '2px',
      default: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
      full: '9999px',
      // Specific values
      input: '4px',
      badge: '16px',
    },
  },

  // ============================================================================
  // Shadows
  // ============================================================================
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    default: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    iframe: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },

  // ============================================================================
  // Transitions & Animations
  // ============================================================================
  transitions: {
    duration: {
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      default: 'ease-in-out',
      easeOut: 'ease-out',
      easeIn: 'ease-in',
    },
    properties: {
      colors: 'transition-colors',
      shadow: 'transition-shadow',
      all: 'transition-all',
    },
  },

  animations: {
    fadeIn: {
      duration: '0.3s',
      easing: 'ease-in-out',
      keyframes: {
        from: { opacity: 0, transform: 'translateY(10px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
    },
  },

  // ============================================================================
  // Layout
  // ============================================================================
  layout: {
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    sidebar: {
      collapsed: '80px',
      expanded: '220px',
    },
    zIndex: {
      base: 0,
      dropdown: 10,
      sticky: 10,
      overlay: 50,
      toast: 100,
    },
  },

  // ============================================================================
  // Component Patterns
  // ============================================================================
  components: {
    button: {
      height: {
        sm: '32px',
        default: '36px',
        lg: '40px',
      },
      fontSize: {
        sm: '12px',
        default: '14px',
        lg: '16px',
      },
      variants: {
        primary: {
          bg: '#00B2A1',
          text: '#FFFFFF',
          hover: '#009688',
        },
        secondary: {
          bg: '#FFFFFF',
          text: '#00B2A1',
          border: '#00B2A1',
          hover: { bg: '#00B2A1', text: '#FFFFFF' },
        },
        tertiary: {
          bg: '#FFFFFF',
          text: '#666666',
          border: '#666666',
          hover: { bg: '#666666', text: '#FFFFFF' },
        },
        ghost: {
          bg: 'transparent',
          text: '#00B2A1',
          hover: { bg: '#F0FDFA' },
        },
      },
    },
    badge: {
      sizes: {
        sm: { padding: '4px 8px', fontSize: '12px' },
        md: { padding: '6px 12px', fontSize: '14px' },
        lg: { padding: '8px 16px', fontSize: '16px' },
      },
      indicator: {
        size: '8px',
        borderRadius: '50%',
      },
    },
    card: {
      default: {
        bg: '#FFFFFF',
        border: '#E4E4E4',
        borderRadius: '8px',
        shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        hoverShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
    },
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status color configuration
 */
export function getStatusColor(type: 'project' | 'priority' | 'system', status: string) {
  return designTokens.colors.status[type][status as keyof typeof designTokens.colors.status[typeof type]];
}

/**
 * Get priority color configuration
 */
export function getPriorityColor(priority: 'critical' | 'high' | 'medium' | 'low') {
  return designTokens.colors.status.priority[priority];
}

/**
 * Get project status color configuration
 */
export function getProjectStatusColor(status: 'draft' | 'hold' | 'in-process' | 'operational') {
  return designTokens.colors.status.project[status];
}

/**
 * Get chart color from palette (cycles through colors)
 */
export function getChartColor(index: number): string {
  const palette = designTokens.colors.charts.palette;
  return palette[index % palette.length];
}

/**
 * Generate Tailwind classes for a button variant
 */
export function getButtonClasses(variant: keyof typeof designTokens.components.button.variants, size: 'sm' | 'default' | 'lg' = 'default') {
  const variantConfig = designTokens.components.button.variants[variant];
  const sizeConfig = designTokens.components.button.height[size];
  
  const baseClasses = [
    'inline-flex items-center justify-center',
    'whitespace-nowrap rounded-md',
    'font-medium',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-teal-500',
    'disabled:opacity-50 disabled:pointer-events-none',
  ];

  const variantClasses = variant === 'primary'
    ? `bg-[${variantConfig.bg}] text-[${variantConfig.text}] hover:bg-[${variantConfig.hover}]`
    : variant === 'secondary'
    ? `bg-[${variantConfig.bg}] text-[${variantConfig.text}] border-2 border-[${variantConfig.border}] hover:bg-[${variantConfig.hover.bg}] hover:text-[${variantConfig.hover.text}]`
    : '';

  const sizeClasses = size === 'sm'
    ? 'h-8 px-3 text-xs'
    : size === 'lg'
    ? 'h-10 px-8'
    : 'h-9 px-4 py-2';

  return [...baseClasses, variantClasses, sizeClasses].join(' ');
}

// ============================================================================
// Type Exports
// ============================================================================

export type DesignTokens = typeof designTokens;
export type ColorPalette = typeof designTokens.colors;
export type TypographyConfig = typeof designTokens.typography;
export type SpacingScale = typeof designTokens.spacing;

