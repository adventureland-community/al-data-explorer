import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";

const WIKI_PARETO = "https://en.wikipedia.org/wiki/Pareto_front";
const WIKI_EV = "https://en.wikipedia.org/wiki/Expected_value";
const WIKI_GEOMETRIC = "https://en.wikipedia.org/wiki/Geometric_distribution";
/** Kora Dereva's upgrade calculator (pastebin CALC_VERSION 8). */
export const PASTEBIN_CALC = "https://pastebin.com/jBMKeLfd";

function HelpBody() {
  return (
    <Stack spacing={1.5}>
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
        priming, failstacks, and primestacks (helmet-proxy farm costs), including scroll4 survival
        when enabled. <strong>Fewest Copies</strong> instead picks the highest success chance from
        your scroll/offering/primling toolkit only — no stack farming — so you burn fewer base items
        when copies are scarce.
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
        Toggle materials and prices in the sidebar; Lucky Slot and Server ugrace fold into the
        chance formula when on. On items with a <code>stat</code> pool, Cheapest may fold property
        scrolls into priming when one Primling + scrolls is cheaper than two primes. The Stat scroll
        grace toggle is a separate path: property scroll + offering for +1 item grace. Shrine time
        assumes Mass Production++ on every click (indicative). Stack columns appear only when the
        plan uses them. Use Copy link to share the current item, levels, and toolkit.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        On an Upgrade path, the plan-steps table is editable: click scroll/offering icons to cycle,
        nudge grace/fail/prime stacks inline. Base / Cap / Chance update with the rest of the EV.
        Reset restores planner defaults.
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
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>How this calculator works</DialogTitle>
        <DialogContent dividers>
          <HelpBody />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
