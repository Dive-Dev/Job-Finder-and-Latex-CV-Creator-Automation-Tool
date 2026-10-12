import { extendTheme } from '@chakra-ui/react'

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const theme = extendTheme({
  config,
  fonts: {
    heading: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif`,
    body: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif`,
    mono: `'JetBrains Mono', monospace`,
  },
  colors: {
    // User Palette:
    // #525FE1: Royal Blue / Electric Indigo rgb(82, 95, 225)
    // #F86F03: Sunset Orange rgb(248, 111, 3)
    // #FFA41B: Warm Amber Yellow rgb(255, 164, 27)
    // #FFF6F4: Pearl Cream White rgb(255, 246, 244)
    palette: {
      blue: '#525FE1',
      orange: '#F86F03',
      yellow: '#FFA41B',
      cream: '#FFF6F4',
    },
    brand: {
      50: '#f0f2ff',
      100: '#d9ddfc',
      200: '#b5bbf8',
      300: '#8f98f3',
      400: '#6e79ec',
      500: '#525FE1', // User #525FE1
      600: '#424cb8',
      700: '#333b90',
      800: '#262c6b',
      900: '#191c49',
    },
    orange: {
      50: '#fff5ed',
      100: '#fee3cf',
      200: '#fdc39e',
      300: '#fc9f69',
      400: '#fb8435',
      500: '#F86F03', // User #F86F03
      600: '#d45700',
      700: '#a34000',
      800: '#732c00',
      900: '#481900',
    },
    yellow: {
      50: '#fffcf0',
      100: '#fef5cc',
      200: '#fde799',
      300: '#fcd661',
      400: '#fbc538',
      500: '#FFA41B', // User #FFA41B
      600: '#d4830a',
      700: '#a36104',
      800: '#734102',
      900: '#472600',
    },
    dark: {
      bg: '#0a0d16',
      card: '#121626',
      cardHover: '#181e33',
      border: 'rgba(255, 246, 244, 0.08)',
      borderHover: 'rgba(82, 95, 225, 0.35)',
      surface: 'rgba(18, 22, 38, 0.75)',
    },
    accent: {
      blue: '#525FE1',
      orange: '#F86F03',
      yellow: '#FFA41B',
      cream: '#FFF6F4',
      cyan: '#06b6d4',
      emerald: '#10b981',
      violet: '#8b5cf6',
      rose: '#f43f5e',
    }
  },
  styles: {
    global: {
      'html, body': {
        bg: '#0a0d16',
        color: '#FFF6F4',
        fontSize: '14px',
        lineHeight: '1.5',
      },
      '*': {
        boxSizing: 'border-box',
        scrollbarWidth: 'thin',
        scrollbarColor: '#525FE1 #0d1120',
      },
      '::-webkit-scrollbar': {
        width: '10px',
        height: '10px',
      },
      '::-webkit-scrollbar-track': {
        background: '#0d1120',
        borderRadius: '6px',
        border: '1px solid rgba(255, 246, 244, 0.08)',
      },
      '::-webkit-scrollbar-thumb': {
        background: '#525FE1',
        borderRadius: '6px',
        border: '2px solid #0d1120',
        boxShadow: 'inset 0 0 6px rgba(255, 246, 244, 0.25)',
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: '#F86F03',
        boxShadow: '0 0 10px rgba(248, 111, 3, 0.65)',
      },
      '::-webkit-scrollbar-thumb:active': {
        background: '#FFA41B',
        boxShadow: '0 0 12px rgba(255, 164, 27, 0.85)',
      },
      '::-webkit-scrollbar-corner': {
        background: '#0d1120',
      },
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          bg: '#121626',
          border: '1px solid',
          borderColor: 'rgba(255, 246, 244, 0.08)',
          borderRadius: 'xl',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
          transition: 'all 0.2s ease-in-out',
        }
      }
    },
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'lg',
        transition: 'all 0.2s',
      },
      variants: {
        solid: {
          bg: '#525FE1',
          color: '#FFF6F4',
          _hover: {
            bg: '#424cb8',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 14px 0 rgba(82, 95, 225, 0.45)',
          },
          _active: {
            transform: 'translateY(0)',
          }
        },
        gradient: {
          bgGradient: 'linear(to-r, #525FE1 0%, #F86F03 100%)',
          color: '#FFF6F4',
          _hover: {
            bgGradient: 'linear(to-r, #424cb8 0%, #FFA41B 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 18px 0 rgba(248, 111, 3, 0.45)',
          }
        },
        retroOrange: {
          bg: '#F86F03',
          color: '#FFF6F4',
          _hover: {
            bg: '#d45700',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 16px 0 rgba(248, 111, 3, 0.45)',
          }
        },
        retroYellow: {
          bg: '#FFA41B',
          color: '#0a0d16',
          fontWeight: '700',
          _hover: {
            bg: '#d4830a',
            color: '#FFF6F4',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 16px 0 rgba(255, 164, 27, 0.45)',
          }
        },
        ghost: {
          color: 'gray.300',
          _hover: {
            bg: 'rgba(255, 246, 244, 0.06)',
            color: '#FFF6F4',
          }
        },
        outline: {
          borderColor: 'rgba(255, 246, 244, 0.14)',
          color: '#FFF6F4',
          _hover: {
            bg: 'rgba(82, 95, 225, 0.1)',
            borderColor: '#525FE1',
          }
        }
      }
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 2.5,
        py: 0.5,
        fontWeight: '700',
        fontSize: 'xs',
        textTransform: 'none',
      }
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid',
            borderColor: 'rgba(255, 246, 244, 0.1)',
            borderRadius: 'lg',
            _hover: {
              borderColor: '#8f98f3',
            },
            _focus: {
              borderColor: '#525FE1',
              boxShadow: '0 0 0 1px #525FE1',
            }
          }
        }
      }
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid',
            borderColor: 'rgba(255, 246, 244, 0.1)',
            borderRadius: 'lg',
            _hover: {
              borderColor: '#8f98f3',
            },
            _focus: {
              borderColor: '#525FE1',
              boxShadow: '0 0 0 1px #525FE1',
            }
          }
        }
      }
    }
  }
})

export default theme
