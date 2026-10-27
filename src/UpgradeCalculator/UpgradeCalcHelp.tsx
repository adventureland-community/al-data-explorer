import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { ItemKey } from "typed-adventureland";

import { ItemImage } from "../ItemImage";

const WIKI_PARETO = "https://en.wikipedia.org/wiki/Pareto_front";
const WIKI_EV = "https://en.wikipedia.org/wiki/Expected_value";
const WIKI_GEOMETRIC = "https://en.wikipedia.org/wiki/Geometric_distribution";
/** Kora Dereva's upgrade calculator (pastebin CALC_VERSION 8). */
export const PASTEBIN_CALC = "https://pastebin.com/jBMKeLfd";

const GLOSSARY_ICON = 24;
const GLOSSARY_SLOT_BG = "#2a2d36";
const GLOSSARY_SLOT_BORDER = "#4a4e5a";

type GlossaryRow = {
  technique: string;
  server: string;
  blurb: string;
  /** Game item keys shown next to the technique name. */
  icons?: ItemKey[];
};

/** Community / UI names ↔ server fields. Keep short — help dialog only. */
const GLOSSARY: GlossaryRow[] = [
  {
    technique: "Primstacking",
    server: "item.grace += 0.5",
    blurb: "Primlings on the item (no scroll).",
    icons: ["offeringp"],
  },
  {
    technique: "Failstack",
    server: "player.p.ugrace",
    blurb: "Fail vendor helmets (variants exist) to bank ugrace.",
    icons: ["helmet"],
  },
  {
    technique: "Ograce bank",
    server: "player.p.ograce",
    blurb: "No common name. Offering fails bank ograce (+0.6 / +0.4).",
    icons: ["helmet", "offeringp"],
  },
  {
    technique: "Server ugrace",
    server: "S.ugrace",
    blurb: "Server-wide ugrace from the same fails; optional in chance.",
    icons: ["helmet"],
  },
  {
    technique: "Stat scroll grace",
    server: "pscroll + offering",
    blurb: "+1 item.grace (qty needed[grade]).",
    icons: ["strscroll", "offeringp"],
  },
  {
    technique: "Scroll 4",
    server: "scroll4 (grade 3.6)",
    blurb: "Fail keeps the item.",
    icons: ["scroll4"],
  },
  {
    technique: "Lucky Slot",
    server: "player.p.item_num",
    blurb:
      "~60% boosted rolls on the lucky inventory slot (EV only — Chance column stays game-accurate).",
  },
  {
    technique: "Item grace",
    server: "item.grace",
    blurb: "Grace on that copy; carried between attempts.",
  },
  {
    technique: "igrace",
    server: "item_def.igrace",
    blurb: "Grade bias from G data (−2…+1); not player-facing.",
  },
];

function GlossaryIcons({ keys }: { keys: ItemKey[] }) {
  return (
    <Stack direction="row" spacing={0.35} alignItems="center" sx={{ flexShrink: 0 }}>
      {keys.map((key) => (
        <Box
          key={key}
          component="span"
          title={key}
          sx={{
            display: "inline-flex",
            width: GLOSSARY_ICON + 4,
            height: GLOSSARY_ICON + 4,
            borderRadius: 0.5,
            border: `1px solid ${GLOSSARY_SLOT_BORDER}`,
            bgcolor: GLOSSARY_SLOT_BG,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 0,
          }}
        >
          <ItemImage itemName={key} size={GLOSSARY_ICON} />
        </Box>
      ))}
    </Stack>
  );
}

function GlossaryTable() {
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" component="h3">
        Glossary
      </Typography>
      <Typography variant="caption" color="text.primary" sx={{ opacity: 0.8 }}>
        Names we show ↔ server fields. Ograce bank has no community nickname — we use the server
        name.
      </Typography>
      <Table
        size="small"
        aria-label="Upgrade technique glossary"
        sx={{
          bgcolor: "background.paper",
          "& td, & th": {
            borderColor: "divider",
            py: 0.75,
            px: 1,
            verticalAlign: "middle",
            bgcolor: "background.paper",
            color: "text.primary",
          },
          "& th": { fontWeight: 700 },
          "& code": { fontSize: "0.75rem" },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell width="32%">Technique</TableCell>
            <TableCell width="26%">Server</TableCell>
            <TableCell>What it is</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {GLOSSARY.map((row) => (
            <TableRow key={row.technique}>
              <TableCell>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {row.icons?.length ? <GlossaryIcons keys={row.icons} /> : null}
                  <Typography variant="body2" fontWeight={600}>
                    {row.technique}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell>
                <Typography variant="body2" component="code">
                  {row.server}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{row.blurb}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}

function HelpBody() {
  return (
    <Stack spacing={1.5}>
      <GlossaryTable />

      <Typography variant="body2" color="text.secondary">
        It plans a path from your start level to the target and reports{" "}
        <Link href={WIKI_EV} target="_blank" rel="noreferrer">
          expected gold
        </Link>{" "}
        (EV): what you spend on average if you keep trying until you succeed. Attempts at a step are
        modeled as a{" "}
        <Link href={WIKI_GEOMETRIC} target="_blank" rel="noreferrer">
          geometric distribution
        </Link>{" "}
        — about <code>1 / chance</code> tries per success, plus destroy risk when the item can be
        lost.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        <strong>Cheapest</strong> minimizes that EV. At each level it tries scrolls, offerings,
        primstacking (Primlings on the item for +0.5 grace), failstacking vendor helmets for{" "}
        <code>ugrace</code>, and banking <code>ograce</code> from offering fails (costed with a
        helmet proxy — that bank has no common community name). Scroll4 survival is included when
        enabled. <strong>Fewest Copies</strong> instead picks the highest success chance from your
        scroll/offering/Primling toolkit only — no helmet farms — so you burn fewer base items when
        copies are scarce.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Cheapest keeps a{" "}
        <Link href={WIKI_PARETO} target="_blank" rel="noreferrer">
          Pareto frontier
        </Link>
        : among candidate states it only keeps ones that are not dominated — lower cost for the same
        leftover grace, or more grace for the same (or lower) cost. That prunes the search without
        throwing away a path that could win later. Mid-path starts (from above +0) use the
        max-chance chain until the Pareto search supports partial starts.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Toggle materials and prices in the sidebar. Chance / Cap match the in-game upgrade UI; Lucky
        Slot does not change those numbers — it only improves expected tries and gold EV (about 60%
        of rolls get a boosted check). The Chance by level chart peels techniques on in order (kit →
        prim → stat grace → failstack → ograce → server ugrace → plan → lucky EV); toggle series in
        the legend. Server <code>ugrace</code> (<code>S.ugrace</code>) folds into the chance formula
        when on. On items with a <code>stat</code> pool, Cheapest may fold property scrolls into
        primstacking when one Primling + scrolls is cheaper than two Primlings. The Stat scroll
        grace toggle is a separate path: property scroll + offering for +1 item grace. Shrine time
        assumes Mass Production++ on every click (indicative). Stack columns appear only when the
        plan uses them (Cheapest may failstack helmets even though Fewest never does). Use Copy link
        to share the current item, levels, toolkit, and price overrides.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        On an Upgrade path, the plan-steps table is editable: left-click scroll/offering icons to
        cycle forward, right-click to go back; nudge primstacking / failstack / ograce inline. Base
        / Cap / Chance update with the rest of the EV. Reset restores planner defaults.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        <strong>Greed</strong> mode farms <em>Essence of Greed</em>: pick any upgradeable item, set
        its unit price (vendor catalog default, or market/event estimate), farm at a High-grade+
        level, and choose scroll/offering. Expected gold is attempt cost ÷ edge-fail chance
        (~1/10000 slice). Keep a free inventory slot or the drop is skipped.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        <strong>Side effects</strong> (under the shopping list, not in plan EV):
      </Typography>
      <Typography variant="body2" color="text.secondary" component="div">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            Chance-edge bucket (1/10000): <em>Lucky</em> on success (upgrade High grade+; compound
            any), <em>Essence of Greed</em> on fail (upgrade High grade+)
          </li>
          <li>Bonus +1 grace at 2.5% per upgrade click</li>
          <li>
            <em>Polish Shiny</em> (toggle): polishes the +0 copy (server rejects polish above level
            0), then upgrades — materials and EV fold into the plan; fail keeps the item
          </li>
          <li>
            Tri-Stone +0→+1 compound: 1.2% chance to become <em>Dark Tri-Stone</em>
          </li>
          <li>
            Boosters: compound always succeeds; with an offering, cascading 12%/6%/… extra levels
          </li>
          <li>
            Fast / Super Fast titles exist in data but are inactive (server assignment commented
            out)
          </li>
        </ul>
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Credit: Cheapest path search, stack farm costs, craft time, and grace math follow{" "}
        <Link href={PASTEBIN_CALC} target="_blank" rel="noreferrer">
          Kora Dereva&apos;s pastebin calculator
        </Link>
        .
      </Typography>
    </Stack>
  );
}

/** Header icon that opens the calculator explainer. */
export function UpgradeCalcHelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip title="How this calculator works">
        <IconButton
          size="small"
          aria-label="How this calculator works"
          onClick={() => setOpen(true)}
        >
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        // Skip fade-in so the backdrop never sits at opacity 0 while readable.
        transitionDuration={0}
        BackdropProps={{
          sx: { bgcolor: "rgba(0, 0, 0, 0.75)", opacity: "1 !important" },
          transitionDuration: 0,
        }}
        PaperProps={{
          elevation: 12,
          sx: {
            // Dark Paper's elevation overlay can look washed; keep a solid surface.
            bgcolor: "background.paper",
            backgroundImage: "none",
            opacity: 1,
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: "background.paper" }}>How this calculator works</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "background.paper", backgroundImage: "none" }}>
          <HelpBody />
        </DialogContent>
        <DialogActions sx={{ bgcolor: "background.paper" }}>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
