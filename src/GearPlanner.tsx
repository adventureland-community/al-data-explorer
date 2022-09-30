// https://classic.wowhead.com/gear-planner/druid/night-elf
// TODO: Character selector
// TODO: level slider
// TODO: gear selector
// TODO: Stats
// TODO: Attack table against specific mobs
// TODO: TrackTrix

import { Box, Modal, Typography } from "@mui/material";
import { width } from "@mui/system";
import { SlotType } from "adventureland";
import React from "react";

// TODO: Defense table against specific mobs

export function GearPlanner() {
  /**
   * EAR HAT EAR AMULET
   * MH CHEST OH CAPE
   * RING LEG RING ORB
   * BELT BOOTS HAND ELIXIR
   */
  // TODO: data for each gear slot with selected item, lvl, stats increases, and such.
  return (
    <>
      <div>
        <div>
          <GearSlot slot="earring1" />
          <GearSlot slot="helmet" />
          <GearSlot slot="earring2" />
          <GearSlot slot="amulet" />
        </div>
        <div>
          <GearSlot slot="mainhand" />
          <GearSlot slot="chest" />
          <GearSlot slot="offhand" />
          <GearSlot slot="cape" />
        </div>
        <div>
          <GearSlot slot="ring1" />
          <GearSlot slot="pants" />
          <GearSlot slot="ring2" />
          <GearSlot slot="orb" />
        </div>
        <div>
          <GearSlot slot="belt" />
          <GearSlot slot="shoes" />
          <GearSlot slot="gloves" />
          <GearSlot slot="elixir" />
        </div>
      </div>
    </>
  );
}

// https://mui.com/material-ui/react-modal/
export function GearSlot({ slot }: { slot: SlotType }) {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const modalStyle = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

  return (
    <>
      <div
        onClick={handleOpen}
        title={slot}
        style={{
          width: 50,
          height: 50,
          border: "1px solid black",
          display: "inline-block",
        }}
      ></div>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Text in a modal
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2 }}>
          HIIIII here should be a gear selection screen
          </Typography>
        </Box>
      </Modal>
    </>
  );
}
