import { useState, useEffect } from "react";

import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

import { getOwners, OwnerResponseProps } from "./getOwners";
import { formatOwnerLabel } from "../Shared/ownerLabel";

type OwnerSelectionProps = {
  onChange: (newOwner: string) => void;
  /** Pre-select this owner id when options load (e.g. from ?owner= query). */
  initialOwner?: string;
};

export function OwnerSelection(props: OwnerSelectionProps) {
  const { onChange, initialOwner } = props;
  const [ownerData, setOwnerData] = useState<OwnerResponseProps[]>([]);
  const [selected, setSelected] = useState<{ label: string; value: string } | null>(null);

  const handleOwnerSelect = (newOwner: string) => {
    console.log("Handle owner select: ", newOwner);
    onChange(newOwner);
  };

  useEffect(() => {
    if (!ownerData.length) {
      getOwners().then((ownersResponse) => {
        console.log(ownersResponse);
        if (ownersResponse?.length) {
          setOwnerData(ownersResponse);
        }
      });
    }
  }, [ownerData.length]);

  const ownerDataOptions = ownerData.map((owner) => {
    const display = formatOwnerLabel(owner.owner, owner.characters);
    const chars = owner.characters?.length ? owner.characters.join(", ") : owner.owner;
    return {
      label: display && display !== owner.owner ? `${display} — ${chars}` : chars,
      value: owner.owner,
    };
  });

  useEffect(() => {
    if (!initialOwner || !ownerDataOptions.length) {
      return;
    }
    const match = ownerDataOptions.find((option) => option.value === initialOwner);
    if (match && selected?.value !== match.value) {
      setSelected(match);
      handleOwnerSelect(match.value);
    } else if (!match && selected?.value !== initialOwner) {
      // Owner id from URL may not be in active-owners list — still select/load it.
      const fallback = { label: initialOwner, value: initialOwner };
      setSelected(fallback);
      handleOwnerSelect(initialOwner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOwner, ownerDataOptions.length]);

  return (
    <Autocomplete
      disablePortal
      fullWidth
      id="owner-data-selector"
      options={ownerDataOptions}
      value={selected}
      onChange={(_, newOwner) => {
        if (newOwner?.value) {
          console.log("On change selected owner: ", newOwner);
          setSelected(newOwner);
          handleOwnerSelect(newOwner.value as string);
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label="Bank selector by owner's characters" />
      )}
      isOptionEqualToValue={(option, value) => option.value === value.value}
    />
  );
}
