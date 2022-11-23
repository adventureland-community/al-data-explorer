import { Button, Dialog, DialogContent, DialogTitle, Input } from "@mui/material";
import { ItemInfo } from "typed-adventureland";
import { SlotType } from "typed-adventureland";
import LZString from "lz-string";
import { useState } from "react";
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
        // const className = characterClass?.className;

        const state = {
            gear,
            className: characterClass?.className,
            level,
        };

        // encode gear using LZW compression in to a compressed, URI safe string.
        const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(state));

        // TODO: append current URL to link
        // const base_url = window.location.origin;
        // const host = window.location.host;
        // const pathArray = window.location.pathname.split("/");
        const baseUrl = window.location.origin + window.location.pathname;
        // setLink(baseUrl + `?gear-planner/${className}/${level}` + encoded);
        setLink(`${baseUrl}?gear=${encoded}`);
        setOpen(true);

        if (encoded) {
            console.log(encoded);
            const decoded = LZString.decompressFromEncodedURIComponent(encoded);
            if (decoded) {
                console.log(JSON.parse(decoded));
            }
        }
    };

    // https://www.w3schools.com/howto/howto_js_copy_clipboard.asp
    const onCopyToClipboard = () => {
        if (link) {
            navigator.clipboard.writeText(link);
        }
    };
    return (
        <>
            <Button onClick={onShowShareLink}>Share</Button>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
                <DialogTitle id="scroll-dialog-title"> Share</DialogTitle>
                <DialogContent>
                    <Input value={link} sx={{ width: "100%" }} />{" "}
                    <Button onClick={onCopyToClipboard}>Copy</Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
