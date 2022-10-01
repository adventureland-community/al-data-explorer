import { ItemName } from "adventureland";
import { useContext } from "react";
import { GDataContext } from "./GDataContext";

export function ItemImage({ itemName }: { itemName: ItemName }) {
  const G = useContext(GDataContext);

  if (!G) {
    return <></>; // TODO: render broken image
  }

  // function item_container(item,actual) in html.js
  const gItem = G.items[itemName];
  const skinPositions = G.positions[gItem.skin] ?? G.positions["placeholder"];
  // TODO: some items don't have a skin? helmets it would seem, mages hood
  if(!skinPositions){ return (<img alt={itemName}/>)}
  const pack = G.imagesets[skinPositions[0] || "pack_20"];
  const x = skinPositions[1];
  const y = skinPositions[2];
  const size = gItem.size || 40;
  const scale = size / pack.size;
  return (
    <div
      style={{ overflow: "hidden", height: `${size}px`, width: `${size}px` }}
    >
      <img
        alt={itemName}
        style={{
          width: `${pack.columns * pack.size * scale}px`,
          height: `${pack.rows * pack.size * scale}px`,
          marginTop: `-${y*size}px`,
          marginLeft: `-${x*size}px`,
          imageRendering: 'pixelated' // Thanks to StormSurge for making the sprites render crisp
        }}
        src={`https://adventure.land${pack.file}`}
      />
    </div>
  );
}

/**
   * https://adventure.land/images/tiles/items/pack_20vt8.png
   * 40x40
   * G.imagesets
   * pack_20:
load: true
rows: 64
file: "/images/tiles/items/pack_20vt8.png"
columns: 16
size: 20

function item_container(item,actual) in html.js

    var pack=G.imagesets[G.positions[item.skin][0]||"pack_20"],
    x=G.positions[item.skin][1],
    y=G.positions[item.skin][2];

		var scale=size/pack.size
	html+="<div style='overflow: hidden; height: "+(size)+"px; width: "+(size)+"px;'>";
    html+="<img style='width: "+(pack.columns*pack.size*scale)+"px; height: "+(pack.rows*pack.size*scale)+"px; margin-top: -"+(y*size)+"px; margin-left: -"+(x*size)+"px;' src='"+pack.file+"' draggable='false' />";
    html+="</div>";
   *
   *
   * 
   * hat <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -0px; opacity: 0.5;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * ear <img style="width: 640px; height: 2560px; margin-top: -680px; margin-left: -200px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * amulet <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -480px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   *
   * mh <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -200px; opacity: 0.36;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * chest <img style="width: 640px; height: 2560px; margin-top: -40px; margin-left: -240px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * oh <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -240px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * cape <img style="width: 640px; height: 2560px; margin-top: -240px; margin-left: -160px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   *
   * pants <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -80px; opacity: 0.5;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * ring <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -520px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * orb <img style="width: 640px; height: 2560px; margin-top: -1000px; margin-left: -80px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   *
   * belt <img style="width: 640px; height: 2560px; margin-top: -120px; margin-left: -160px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * shoes <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -120px; opacity: 0.5;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * gloves <img style="width: 640px; height: 2560px; margin-top: -80px; margin-left: -400px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * elixir <img style="width: 640px; height: 2560px; margin-top: -1080px; margin-left: -0px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   */
