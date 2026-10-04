import sizeDisplayName from "./formatSize";

export default function signedSizeDisplayName(value: number, bytesStringBase2: boolean) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${sizeDisplayName(Math.abs(value), bytesStringBase2)}`;
}
