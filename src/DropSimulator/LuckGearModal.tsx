import SettingsIcon from "@mui/icons-material/Settings";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { ItemInfo, SlotType } from "typed-adventureland";

import { ImportLinkButton } from "../GearPlanner/ImportLinkButton";
import { LoadLinkButton } from "../GearPlanner/LoadLinkButton";
import { LoadoutPickerShell } from "../GearPlanner/LoadoutPickerShell";
import { SaveLinkButton } from "../GearPlanner/SaveLinkButton";
import { SavedLoadout, SelectedCharacterClass } from "../GearPlanner/types";
import { cloneLoadoutGear } from "../gameData/loadoutStats";
import { GDataContext } from "../GDataContext";
import { getTitleName } from "../Shared/iteminfo-util";
import { ItemInstance } from "../Shared/ItemInstance";
import { computeLuckmFromGear, DROP_SIM_LUCK_STORAGE_KEY, luckmToUiPercent } from "./luckFromGear";

/** Matches item-tooltip luck color. */
const LUCK_ACCENT = "#34d399";

export function LuckGearModal({
  luckm,
  onApply,
}: {
  luckm: number;
  onApply: (luckm: number) => void;
}) {
  const G = useContext(GDataContext);
  const [open, setOpen] = useState(false);
  const [gear, setGear] = useState<{ [slot in SlotType]?: ItemInfo }>({});
  const [selectedClass, setSelectedClass] = useState<SelectedCharacterClass>();
  const [level, setLevel] = useState(1);
  const [partyXluck, setPartyXluck] = useState(0);

  const computed = useMemo(
    () =>
      G
        ? computeLuckmFromGear({
            gear,
            G,
            classKey: selectedClass?.className,
            partyXluck,
          })
        : { xluck: 0, luckm: 1, breakdown: [] },
    [G, gear, selectedClass?.className, partyXluck],
  );

  if (!G) return null;

  const classes = Object.entries(G.classes ?? []).map(
    ([className, item]) => ({ className, ...item } as SelectedCharacterClass),
  );

  const applyLoadout = (loadout: SavedLoadout, party = 0) => {
    setGear(cloneLoadoutGear(loadout.gear));
    setLevel(loadout.level);
    setPartyXluck(party);
    setSelectedClass(
      loadout.classKey ? classes.find((c) => c.className === loadout.classKey) : undefined,
    );
  };

  const removeFromSlot = (slot: SlotType) => {
    setGear((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const handleApply = () => {
    onApply(computed.luckm);
    setOpen(false);
  };

  const uiLuck = luckmToUiPercent(computed.luckm);
  const simDiffers = Math.abs(computed.luckm - luckm) > 0.005;
  const gearLines = computed.breakdown.filter((line) => line.slot !== "party");

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<SettingsIcon sx={{ fontSize: 16 }} />}
        onClick={() => setOpen(true)}
        sx={{ textTransform: "none", minWidth: 0, px: 1.25, py: 0.5 }}
      >
        Luck gear
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundImage: (theme) =>
              theme.palette.mode === "dark"
                ? `linear-gradient(160deg, ${LUCK_ACCENT}14 0%, transparent 45%)`
                : `linear-gradient(160deg, ${LUCK_ACCENT}18 0%, transparent 45%)`,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={2}
            flexWrap="wrap"
          >
            <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
              Luck gear
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
              <ImportLinkButton load={(_name, data) => applyLoadout(data, 0)} />
              <LoadLinkButton
                storageKey={DROP_SIM_LUCK_STORAGE_KEY}
                load={(_name, data) => applyLoadout(data, 0)}
              />
              <SaveLinkButton
                gear={gear}
                characterClass={selectedClass}
                level={level}
                storageKey={DROP_SIM_LUCK_STORAGE_KEY}
              />
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Import a character or equip slots — sheet Luck matches what Apply sends to the sim.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: "divider", pt: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2.5}
            alignItems={{ xs: "stretch", sm: "stretch" }}
          >
            <Box
              sx={{
                flex: "1 1 0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minWidth: 0,
                py: { sm: 0.5 },
              }}
            >
              <LoadoutPickerShell
                gear={gear}
                onGearChange={setGear}
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
                onClearClass={() => setSelectedClass(undefined)}
                classes={classes}
                items={G.items}
                variant="luck"
                hint="Click a slot · Lucky / Festive in the picker · ✕ to remove"
              />
            </Box>
            <Box
              sx={{
                flex: "1 1 0",
                minWidth: { sm: 260 },
                maxWidth: { sm: 380 },
                p: 2,
                borderRadius: 1.5,
                border: 1,
                borderColor: `${LUCK_ACCENT}55`,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? `${LUCK_ACCENT}12` : `${LUCK_ACCENT}14`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
                <Typography
                  variant="overline"
                  sx={{ color: LUCK_ACCENT, letterSpacing: 1, fontWeight: 700 }}
                >
                  Sheet total
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: LUCK_ACCENT,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {uiLuck}%
                </Typography>
              </Stack>
              {simDiffers ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Simulator is at {luckmToUiPercent(luckm)}%
                </Typography>
              ) : null}

              <Divider sx={{ my: 1.5, borderColor: `${LUCK_ACCENT}33` }} />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, mb: 0.75 }}
              >
                From gear
              </Typography>
              {gearLines.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  No luck gear yet
                </Typography>
              ) : (
                <Box sx={{ mb: 1, flex: 1, minHeight: 0 }}>
                  {gearLines.map((line) => {
                    const slotItem = gear[line.slot as SlotType];
                    const titleLabel =
                      slotItem?.p != null
                        ? getTitleName({ p: slotItem.p, name: slotItem.name }, G)
                        : "";
                    return (
                      <Box
                        key={`${line.slot}-${line.itemKey}-${line.level}-${line.titleKey ?? ""}`}
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          mb: 0.5,
                          py: 0.25,
                          px: 0.5,
                          borderRadius: 1,
                          "&:hover": {
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(0,0,0,0.03)",
                          },
                        }}
                      >
                        {slotItem ? (
                          <ItemInstance itemInfo={slotItem} size={28} />
                        ) : line.itemKey ? (
                          <ItemInstance
                            itemInfo={{ name: line.itemKey, level: line.level || undefined }}
                            size={28}
                          />
                        ) : null}
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                          {line.label}
                          {line.itemKey ? (
                            <Typography component="span" variant="caption" color="text.secondary">
                              {" "}
                              · {line.itemKey}
                              {line.level ? ` +${line.level}` : ""}
                              {titleLabel ? ` · ${titleLabel.trim()}` : ""}
                            </Typography>
                          ) : null}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ color: LUCK_ACCENT, fontVariantNumeric: "tabular-nums" }}
                        >
                          +{line.xluck}
                        </Typography>
                        <Tooltip title="Remove from slot">
                          <IconButton
                            size="small"
                            aria-label={`Remove ${line.label}`}
                            onClick={() => removeFromSlot(line.slot as SlotType)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Box>
              )}

              <Box sx={{ mt: "auto", pt: 1 }}>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Party (under 60)
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: LUCK_ACCENT,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    +{partyXluck}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mb: 0.5 }}
                >
                  +10 per member
                </Typography>
                <Slider
                  size="small"
                  value={partyXluck}
                  onChange={(_, v) => setPartyXluck(v as number)}
                  min={0}
                  max={100}
                  step={10}
                  marks={[
                    { value: 0, label: "0" },
                    { value: 50, label: "50" },
                    { value: 100, label: "100" },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `+${v}`}
                  sx={{
                    color: LUCK_ACCENT,
                    mt: 0.5,
                    "& .MuiSlider-markLabel": { fontSize: "0.7rem" },
                  }}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: LUCK_ACCENT,
              color: "#052e1c",
              "&:hover": { bgcolor: "#2bb883" },
            }}
          >
            Apply to simulator
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
