import { useState, useEffect } from "react";

import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

import { getOwners, OwnerResponseProps } from "./getOwners";

type OwnerSelectionProps = {
  onChange: (newOwner: string) => void;
};

export function OwnerSelection(props: OwnerSelectionProps) {
  const [ownerData, setOwnerData] = useState<OwnerResponseProps[]>([]);

  const handleOwnerSelect = (newOwner: string) => {
    console.log("Handle owner select: ", newOwner);
    props.onChange(newOwner);
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

  const ownerDataOptions = ownerData?.map((owner) => ({
    label: owner.characters.join(", "),
    value: owner.owner,
  }));

  return (
    <Autocomplete
      disablePortal
      fullWidth
      id="owner-data-selector"
      options={ownerDataOptions}
      onChange={(_, newOwner) => {
        if (newOwner?.value) {
          console.log("On change selected owner: ", newOwner);
          handleOwnerSelect(newOwner?.value as string);
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label="Bank selector by owner's characters" />
      )}
      isOptionEqualToValue={(option, value) => option.value === value.value}
    />
  );
}
