import { Card, CardContent, Typography } from "@mui/material";
import { useContext, useState } from "react";
import { GDataContext } from "../GDataContext";
import { OwnerSelection } from "./OwnerSelection";
import { BankRender } from "./BankRender";

function Info() {
  return (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography component="div">
          This page shows bank data using the bank endpoint from{" "}
          <a href="https://aldata.earthiverse.ca">earthiverse&apos;s aldata</a>
          &nbsp;&nbsp;
          <a
            target="_blank"
            rel="noreferrer"
            href="https://github.com/earthiverse/ALData?tab=readme-ov-file#authentication"
          >
            Get a api key{" "}
          </a>
          &nbsp;&nbsp;
          <a
            target="_blank"
            rel="noreferrer"
            href="https://github.com/earthiverse/ALData?tab=readme-ov-file#put-bankownerkey"
          >
            Push bank data
          </a>
        </Typography>
      </CardContent>
    </Card>
  );
}

export function Bank() {
  const [selectedOwner, setSelectedOwner] = useState<string>("");

  const handleOwnerSelect = (owner: string) => {
    console.log("Handle owner select: ", selectedOwner);
    if (owner) {
      setSelectedOwner(owner);
    }
  };

  const G = useContext(GDataContext);

  if (!G) {
    return <>WAITING!</>;
  }

  return (
    <>
      <Info />
      <OwnerSelection onChange={handleOwnerSelect} />
      <BankRender ownerId={selectedOwner} />
    </>
  );
}
