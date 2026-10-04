import { t } from "@lingui/core/macro";
import { Button, Image, Paper, ScrollArea, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useServerInstanceContext } from "../core/context/ServerInstanceContext";
import { sniffImageMime, sniffsAsText } from "./lineDiff";

export const MAX_TEXT_BYTES = 512 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Preview =
  | { kind: "pending" }
  | { kind: "none" }
  | { kind: "text"; text: string }
  | { kind: "image"; mime: string }
  | { kind: "error" };

type Props = {
  obj: string;
  size: number;
};

export default function ContentPreview({ obj, size }: Props) {
  const { kopiaService } = useServerInstanceContext();
  const [preview, setPreview] = useState<Preview>({ kind: "pending" });
  const [imageUrl, setImageUrl] = useState<string>();
  const [loadingImage, setLoadingImage] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: sniff once per object
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (size === 0) {
        setPreview({ kind: "none" });
        return;
      }
      const head = await kopiaService.getObjectHead(obj, 512);
      if (cancelled) return;
      if (head.isError || !head.data) {
        setPreview({ kind: "error" });
        return;
      }
      const mime = sniffImageMime(head.data);
      if (mime) {
        setPreview(size <= MAX_IMAGE_BYTES ? { kind: "image", mime } : { kind: "none" });
        return;
      }
      if (!sniffsAsText(head.data) || size > MAX_TEXT_BYTES) {
        setPreview({ kind: "none" });
        return;
      }
      const full = await kopiaService.getObjectBuffer(obj);
      if (cancelled) return;
      if (full.isError || !full.data) {
        setPreview({ kind: "error" });
        return;
      }
      setPreview({ kind: "text", text: new TextDecoder().decode(full.data) });
    })();
    return () => {
      cancelled = true;
    };
  }, [obj, size]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const showImage = async (mime: string) => {
    setLoadingImage(true);
    const resp = await kopiaService.getObjectBuffer(obj);
    setLoadingImage(false);
    if (resp.isError || !resp.data) {
      setPreview({ kind: "error" });
      return;
    }
    setImageUrl(URL.createObjectURL(new Blob([resp.data], { type: mime })));
  };

  if (preview.kind === "none" || preview.kind === "pending") return null;
  if (preview.kind === "error") {
    return (
      <Text fz="xs" c="red.6">
        {t`Preview could not be loaded.`}
      </Text>
    );
  }
  if (preview.kind === "image") {
    if (imageUrl) return <Image src={imageUrl} mah={240} maw="100%" w="auto" fit="contain" radius="sm" />;
    return (
      <Button
        variant="subtle"
        size="compact-xs"
        loading={loadingImage}
        onClick={() => showImage(preview.mime)}
      >
        {t`Show preview`}
      </Button>
    );
  }
  return (
    <Paper withBorder radius="sm">
      <ScrollArea.Autosize mah={260}>
        <Text component="pre" ff="monospace" fz="xs" m={0} p={6} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {preview.text}
        </Text>
      </ScrollArea.Autosize>
    </Paper>
  );
}
