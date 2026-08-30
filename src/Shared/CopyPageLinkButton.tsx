import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import { Button, Snackbar } from "@mui/material";
import { useCallback, useState } from "react";

import { buildShareUrl } from "../gameData/loadoutUrl";

export function CopyPageLinkButton({
  label = "Copy link",
  pathname,
  search,
}: {
  label?: string;
  pathname?: string;
  search?: string;
}) {
  const [toast, setToast] = useState(false);

  const onCopy = useCallback(async () => {
    const path = pathname ?? window.location.pathname;
    const params = search ?? window.location.search.replace(/^\?/, "");
    const url = buildShareUrl(path, new URLSearchParams(params));
    try {
      await navigator.clipboard.writeText(url);
      setToast(true);
    } catch {
      // Clipboard blocked — Snackbar still shows nothing; user can copy from address bar.
    }
  }, [pathname, search]);

  return (
    <>
      <Button size="small" startIcon={<LinkIcon />} onClick={onCopy} variant="outlined">
        {label}
      </Button>
      <Snackbar
        open={toast}
        autoHideDuration={2500}
        onClose={() => setToast(false)}
        message="Link copied to clipboard"
      />
    </>
  );
}

export function CopyTextButton({ text, label }: { text: string; label?: string }) {
  const [toast, setToast] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(true);
    } catch {
      // ignore
    }
  }, [text]);

  return (
    <>
      <Button size="small" startIcon={<ContentCopyIcon />} onClick={onCopy}>
        {label ?? "Copy"}
      </Button>
      <Snackbar
        open={toast}
        autoHideDuration={2500}
        onClose={() => setToast(false)}
        message="Copied"
      />
    </>
  );
}
