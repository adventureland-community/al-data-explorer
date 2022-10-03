import { Box, Input } from "@mui/material";
import { ItemInfo } from "adventureland";
import { ChangeEvent, useContext } from "react";
import { GDataContext } from "../GDataContext";
import { ItemImage } from "../ItemImage";

export function ItemInstance({ itemInfo }: { itemInfo: ItemInfo }) {
  const G = useContext(GDataContext);
  if (!G) {
    return <></>;
  }
  const itemName = itemInfo.name;
  const gItem = G.items[itemName];

  const levelStyle = {
    position: "absolute",
    bottom: 0,
    left: 0,
    border: 1,
    borderColor: (theme: any) =>
      theme.palette.mode === "dark" ? "grey.800" : "grey.300",
    // m: 1,
    // borderRadius: "16px",
    width: "18px",
    height: "18px",
    bgcolor: "background.paper",
    //
    textAlign: "center",
    fontSize: "0.775rem",
  };
  // TODO: include tooltip?
  //   const onChangeLevel = (event: ChangeEvent<HTMLInputElement>) => {
  //     const level = Number(event.target.value);
  //     if (!level) {
  //       itemInfo.level = 0;
  //     } else {
  //       itemInfo.level = level;
  //     }
  //   };
  return (
    <div style={{ position: "relative" }}>
      <ItemImage itemName={itemName}></ItemImage>
      {(gItem.upgrade || gItem.compound) && itemInfo.level ? (
        <Box sx={levelStyle}>
          {itemInfo.level}
          {/* <Input value={itemInfo.level} onChange={onChangeLevel}></Input> */}
        </Box>
      ) : ''}
    </div>
  );
}
