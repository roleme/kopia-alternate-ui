import { Checkbox, type CSSVariablesResolver, createTheme, Modal } from "@mantine/core";

export function buildTheme(closeLabel: string) {
  return createTheme({
    fontFamily: '"Nunito Variable", sans-serif',
    autoContrast: true,
    luminanceThreshold: 0.179,
    primaryShade: { light: 8, dark: 8 },
    respectReducedMotion: true,
    headings: {
      sizes: {
        h1: { fontSize: "1.75rem", lineHeight: "1.25" }
      }
    },
    components: {
      Checkbox: Checkbox.extend({ defaultProps: { size: "md" } }),
      Modal: Modal.extend({
        defaultProps: { closeButtonProps: { "aria-label": closeLabel } }
      })
    }
  });
}

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-dimmed": "var(--mantine-color-gray-7)",
    "--mantine-color-anchor": "var(--mantine-color-blue-8)",
    "--mantine-color-error": "var(--mantine-color-red-9)",
    "--mantine-color-green-6": "#1f7a33",
    "--mantine-color-red-6": "#c92a2a",
    "--mantine-color-yellow-6": "#8a5a00",
    "--mantine-color-blue-6": "var(--mantine-color-blue-8)",
    "--mantine-color-red-text": "#c92a2a",
    "--mantine-color-green-text": "#1f7a33",
    "--mantine-color-yellow-text": "#8a5a00",
    "--mantine-color-red-outline": "#c92a2a",
    "--mantine-color-green-outline": "#1f7a33",
    "--mantine-color-yellow-outline": "#8a5a00"
  },
  dark: {
    "--mantine-color-dimmed": "#a6a6a6",
    "--mantine-color-red-6": "var(--mantine-color-red-4)",
    "--mantine-color-blue-6": "var(--mantine-color-blue-4)"
  }
});
