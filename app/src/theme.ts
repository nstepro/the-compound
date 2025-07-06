import { createTheme } from '@mantine/core';

export const theme = createTheme({
  // Set your primary color - this will be used throughout the app
  primaryColor: 'brand',
  
  // Custom color scheme
  colors: {
    // Updated brand colors centered around rgb(48, 127, 226)
    brand: [
      '#e8f2ff', // #e8f2ff
      '#b8dafe', // #b8dafe
      '#87c2fd', // #87c2fd
      '#55aafc', // #55aafc
      '#2f91fb', // #2f91fb
      '#307fe2', // Primary brand color - rgb(48, 127, 226)
      '#2a6bc4', // #2a6bc4
      '#2356a6', // #2356a6
      '#1c4288', // #1c4288
      '#152e6a', // #152e6a
    ],
    // Custom accent color - yellow centered around rgb(250, 195, 50)
    accent: [
      '#fefcf0', // Very light yellow
      '#fdf7d6', // Light yellow
      '#fcf2bc', // Lighter yellow
      '#fbeda2', // Light-medium yellow
      '#fae888', // Medium-light yellow
      '#fac332', // Primary accent color - rgb(250, 195, 50)
      '#e6b02d', // Medium-dark yellow
      '#d19c28', // Darker yellow
      '#bc8823', // Dark yellow
      '#a7741e', // Very dark yellow
    ],
    // Custom background color - rgb(249, 243, 233)
    background: [
      '#fdfcfa',
      '#fbf8f3',
      '#f9f3e9', // Main background color - rgb(249, 243, 233)
      '#f2e9db', //rgb(241, 231, 214)
      '#f5e9d5', // #f5e9d5
      '#f3e4cb', // #f3e4cb
      '#f1dfc1', // #f1dfc1
      '#efdab7', // #efdab7
      '#edd5ad', // #edd5ad
      '#ebd0a3', // #ebd0a3
    ],
  },

  // Default font family
  fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMonospace: 'Courier Prime, monospace',

  // Custom spacing
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  // Custom breakpoints
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },

  // Component-specific styling
  components: {
    Card: {
      defaultProps: {
        shadow: 'none',
        radius: 'lg',
        withBorder: true,
      },
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-white)',
          border: '1px solid var(--mantine-color-brand-6)',
          transition: 'all 0.2s ease',
        },
      },
    },



    Container: {
      defaultProps: {
        size: 'xl',
      },
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-background-2)',
        },
      },
    },

    Badge: {
      styles: {
        root: {
          fontFamily: 'var(--mantine-font-family-monospace)',
          fontWeight: 500,
          textTransform: 'none',
        },
      },
    },

    Title: {
      styles: {
        root: {
          color: 'var(--mantine-color-brand-6)', // Use brand color from theme
          fontWeight: 700,
        },
      },
    },

    Text: {
      styles: {
        root: {
          color: 'var(--mantine-color-gray-7)',
        },
      },
    },

    TextInput: {
      styles: {
        input: {
          borderColor: 'var(--mantine-color-gray-4)',
          '&:focus': {
            borderColor: 'var(--mantine-color-brand-6)', // Use brand color from theme
          },
        },
      },
    },

    Select: {
      styles: {
        input: {
          borderColor: 'var(--mantine-color-gray-4)',
          '&:focus': {
            borderColor: 'var(--mantine-color-brand-6)', // Use brand color from theme
          },
        },
      },
    },
  },

  // Global styles
  other: {
    cardBorderRadius: '12px',
    cardShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    cardHoverShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
  },
}); 