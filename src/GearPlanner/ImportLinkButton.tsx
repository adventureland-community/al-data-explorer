import {
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Input,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { ItemInfo } from "adventureland";
import { SlotType } from "adventureland/dist/src/entities/slots";
import { ClassKey } from "adventureland/dist/src/types/GTypes/classes";
import axios from "axios";
import LZString from "lz-string";
import { useRef, useState } from "react";
import { CLASS_COLOR } from "../constants";
import { SavedLoadout, SavedLoadouts, SelectedCharacterClass } from "./types";

export function ImportLinkButton({
  load,
}: {
  load: (name: string, data: SavedLoadout) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loadouts, setLoadouts] = useState<SavedLoadouts>({});

  const characterNameRef = useRef<HTMLInputElement>(null);

  // let loadouts: SavedLoadouts = {};
  // const loadoutString = localStorage.getItem("loadouts") ?? "";
  // if (loadoutString) {
  //   loadouts = JSON.parse(loadoutString);
  //   // TODO: what if a loadout with that name already exists? warn before override?
  // }

  const onSelectLoadout = (name: string, data: SavedLoadout) => {
    load(name, data);
  };
  // TODO: save character names?

  const singleCharacterRegex = new RegExp(
    "var slots(?<name>.+)=(?<slots>.+);(?:.|\n)+Class:</span>(?<class>.+)</div>(?:.|\n)+Level:</span>(?<level>.+)</div>"
  );

  const multipleCharacterRegex =
    /var slots(?<name>.+)=(?<slots>.+);(?:.|\n)+?Class:<\/span>(?<class>.+)<\/div>(?:.|\n)+?Level:<\/span>(?<level>.+)<\/div>/gm;

  const onExtractSingleCharacter = async () => {
    if (characterNameRef.current?.value) {
      // we proxy requests to /al to adventure.land to get around CORS issues.
      const response = await axios.get(
        `/al/character/${characterNameRef.current.value}`
      );
      const html = response.data;
      const match = html.match(singleCharacterRegex);
      console.log("match", match);
      const name = match.groups.name;
      const gear = JSON.parse(match.groups.slots);
      const classKey = match.groups.class.trim().toLowerCase();
      const level = Number(match.groups.level.trim());
      // console.log(match, classKey, level, gear);
      setLoadouts({
        [name]: {
          gear,
          classKey,
          level,
        },
      });
    }
  };

  const onExtractAllPublicCharacter = async () => {
    if (characterNameRef.current?.value) {
      // we proxy requests to /al to adventure.land to get around CORS issues.
      const response = await axios.get(
        `/al/player/${characterNameRef.current.value}`
      );
      const html = response.data;

      const alLoadouts: SavedLoadouts = {};

      let match: any;

      while ((match = multipleCharacterRegex.exec(html)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (match.index === multipleCharacterRegex.lastIndex) {
          multipleCharacterRegex.lastIndex++;
        }

        if (match) {
          const name = match.groups.name as string;
          const gear = JSON.parse(match.groups.slots);
          const classKey = match.groups.class.trim().toLowerCase();
          const level = Number(match.groups.level.trim());
          console.log(match, classKey, level, gear);
          alLoadouts[name] = {
            gear,
            classKey,
            level,
          };
        }
      }

      setLoadouts(alLoadouts);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>IMPORT</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle id="scroll-dialog-title"> Import</DialogTitle>
        <DialogContent>
          <Input
            inputRef={characterNameRef}
            placeholder="character name"
            sx={{ width: "100%", marginBottom: "5px" }}
          ></Input>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={() => onExtractSingleCharacter()}
              title="extract the character with the exact name"
            >
              Extract character
            </Button>
            <Button
              variant="contained"
              onClick={() => onExtractAllPublicCharacter()}
              title="extract all public characters from this name"
            >
              Extract ALL public character
            </Button>
          </Stack>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Class</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(loadouts).map(([key, data]) => {
                const classColor = data.classKey
                  ? CLASS_COLOR[data.classKey].toString().replace("0x", "#")
                  : "primary";

                // console.log(key, data, classColor, CLASS_COLOR);
                return (
                  <TableRow hover
                    key={key}
                    onClick={() => onSelectLoadout(key, data)}
                    sx={{
                      backgroundColor: classColor,
                      cursor: "pointer",
                    }}
                  >
                    <TableCell>{key}</TableCell>
                    <TableCell>{data.level}</TableCell>
                    <TableCell>{data.classKey}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
