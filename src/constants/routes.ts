export const ROUTES = {
  HOME: '/',
  BROWSE: '/browse',
  LIBRARY: '/library',
  STORE: '/store',
  SERIES: '/series/:id',
  SERIES_BY_ID: (id: string) => `/series/${id}`,
  PLAYER: '/player/:episodeId',
  PLAYER_BY_ID: (id: string) => `/player/${id}`,
  SETTINGS: '/settings',
  ONBOARDING: '/onboarding',
  AUTH: '/auth',
  PAYMENT_SUCCESS: '/payment/success',
} as const;
