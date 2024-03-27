import { Box } from "@mui/material";
import { ItemInfo } from "typed-adventureland";
import React, { useContext } from "react";
import { GDataContext } from "../GDataContext";
import { ItemImage } from "../ItemImage";
import { getLevelString } from "../Utils";
import { abbreviateNumber } from "./utils";

export function ItemInstance({
  itemInfo,
  showQuantity,
  showTitleBorder,
}: {
  itemInfo: ItemInfo;
  showQuantity?: boolean;
  showTitleBorder?: boolean;
}) {
  if (showTitleBorder === undefined) showTitleBorder = !!itemInfo.p;

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
    borderColor: (theme: any) => (theme.palette.mode === "dark" ? "grey.800" : "grey.300"),
    // m: 1,
    // borderRadius: "16px",
    width: "18px",
    height: "18px",
    // bgcolor: "background.paper",
    bgcolor: "#00000071",
    //
    textAlign: "center",
    fontSize: "0.675rem",
  };

  const quantityStyle = {
    position: "absolute",
    bottom: 0,
    right: 0,
    border: 0.5,
    borderColor: (theme: any) => (theme.palette.mode === "dark" ? "grey.800" : "grey.300"),
    // m: 1,
    // borderRadius: "16px",
    width: "20px",
    height: "18px",
    bgcolor: "#00000071",

    //
    textAlign: "center",
    fontSize: "0.675rem",
    overflow: "hidden",
  };
  // TODO: include tooltip?
  //   const onChangeLevel = (event: React.ChangeEvent<HTMLInputElement>) => {
  //     const level = Number(event.target.value);
  //     if (!level) {
  //       itemInfo.level = 0;
  //     } else {
  //       itemInfo.level = level;
  //     }
  //   };

  const levelString = getLevelString(gItem, itemInfo.level);
  const titleKey = itemInfo.p;
  let titleBorderColor;
  switch (titleKey) {
    case "festive":
      titleBorderColor = "#79ff7e";
      break;
    case "firehazard":
      titleBorderColor = "#f79b11";
      break;
    case "glitched":
      titleBorderColor = "grey";
      break;
    case "gooped":
      titleBorderColor = "#64B867";
      break;
    case "legacy":
      titleBorderColor = "white";
      break;
    case "lucky":
      titleBorderColor = "#00f3ff";
      break;
    case "shiny":
      titleBorderColor = "#99b2d8";
      break;
    case "superfast":
      titleBorderColor = "#c681dc";
      break;
    default:
      break;
  }

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        verticalAlign: "inherit",
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: showTitleBorder && titleBorderColor ? titleBorderColor : "transparent",
        padding: 1,
      }}
    >
      <ItemImage itemName={itemName} />
      {(gItem.upgrade || gItem.compound) && itemInfo.level ? (
        <Box sx={levelStyle}>
          {levelString}
          {/* <Input value={itemInfo.level} onChange={onChangeLevel}></Input> */}
        </Box>
      ) : (
        ""
      )}
      {itemInfo.q && itemInfo.q > 1 && showQuantity ? (
        <Box sx={quantityStyle}>{abbreviateNumber(itemInfo.q)}</Box>
      ) : (
        <></>
      )}
    </div>
  );
}
