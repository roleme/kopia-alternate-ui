import { useDocumentVisibility } from "@mantine/hooks";
import { useEffect, useLayoutEffect, useRef } from "react";

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  const hidden = useDocumentVisibility() === "hidden";
  const wasHidden = useRef(false);

  useLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || hidden) {
      return;
    }

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => {
      clearInterval(id);
    };
  }, [delay, hidden]);

  useEffect(() => {
    if (hidden) {
      wasHidden.current = true;
      return;
    }
    if (wasHidden.current) {
      wasHidden.current = false;
      if (delay !== null) {
        savedCallback.current();
      }
    }
  }, [hidden, delay]);
}
