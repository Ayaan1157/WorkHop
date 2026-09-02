export const COLORS = {
  surface: "#FFFFFF",
  surfaceSecondary: "#F9F9F6",
  surfaceTertiary: "#EAEAEA",
  onSurface: "#121212",
  onSurfaceMuted: "#6B6B6B",
  brand: "#FF5A00",
  onBrand: "#FFFFFF",
  black: "#121212",
  white: "#FFFFFF",
  success: "#00A86B",
  error: "#E63946",
  border: "#121212",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  pill: 999,
};

export const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL as string) || "";
