import { type MantineColorScheme } from "@mantine/core";

export function parseColorScheme(theme: string): MantineColorScheme {
  if (theme !== "light" && theme !== "dark" && theme !== "auto") return "light";
  return theme;
}
