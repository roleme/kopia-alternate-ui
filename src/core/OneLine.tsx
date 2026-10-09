import { Box, Text } from "@mantine/core";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

type Item = {
  key: string;
  node: ReactNode;
};

type Props = {
  items: Item[];
  keep?: ReactNode;
  gap?: number;
  moreWidth?: number;
};

export function OneLine({ items, keep, gap = 5, moreWidth = 34 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(items.length);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (items.length === 0) {
      setVisible(0);
      return;
    }

    const measure = () => {
      const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-fit-item]"));
      const keepEl = el.querySelector<HTMLElement>("[data-fit-keep]");
      const keepWidth = keepEl ? keepEl.offsetWidth + gap : 0;
      const available = el.clientWidth - keepWidth;
      let used = 0;
      let count = 0;
      for (let i = 0; i < nodes.length; i++) {
        const width = nodes[i].offsetWidth + gap;
        const reserve = i < nodes.length - 1 ? moreWidth : 0;
        if (used + width + reserve > available) break;
        used += width;
        count++;
      }
      setVisible(count);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, gap, moreWidth]);

  return (
    <Box
      ref={ref}
      style={{
        display: "flex",
        flexWrap: "nowrap",
        alignItems: "center",
        gap,
        overflow: "hidden",
        position: "relative"
      }}
    >
      {items.map((item, index) => (
        <span
          key={item.key}
          data-fit-item
          style={
            index < visible
              ? { flex: "none", display: "inline-flex" }
              : { position: "absolute", visibility: "hidden", pointerEvents: "none", display: "inline-flex" }
          }
        >
          {item.node}
        </span>
      ))}
      {visible < items.length && (
        <Text span fz="xs" fw={700} c="dimmed" style={{ flex: "none" }}>
          +{items.length - visible}
        </Text>
      )}
      {keep && (
        <span data-fit-keep style={{ flex: "none", display: "inline-flex", alignItems: "center", gap }}>
          {keep}
        </span>
      )}
    </Box>
  );
}
