import { Button, Dialog, DialogContent, DialogTitle, Input } from "@mui/material";
import { ItemInfo, SlotType } from "typed-adventureland";
import { useState } from "react";

import { encodeGearShareState } from "./gearShareState";
import { SelectedCharacterClass } from "./types";

export function ShareLinkButton({
  gear,
  characterClass,
  level,
}: {
  gear: { [slot in SlotType]?: ItemInfo };
  characterClass: SelectedCharacterClass | undefined;
  level: number;
}) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | undefined>();

  const onShowShareLink = () => {
    const encoded = encodeGearShareState({
      gear,
      className: characterClass?.className,
      level,
    });
    setLink(`${window.location.origin}/gear?gear=${encoded}`);
    setOpen(true);
  };

  const onCopyToClipboard = () => {
    if (link) {
      navigator.clipboard.writeText(link);
    }
  };

  return (
    <>
      <Button onClick={onShowShareLink}>Share</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>Share</DialogTitle>
        <DialogContent>
          <Input value={link} sx={{ width: "100%" }} />{" "}
          <Button onClick={onCopyToClipboard}>Copy</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
