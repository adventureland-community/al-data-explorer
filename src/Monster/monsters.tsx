// TODO search for monster
// TODO: search for item name / drop
// TODO: list all monsters, allow sorting by column
// TODO: show icon, key, name, locations, drop
// TODO: calculations, hits to kill (depends on supplying stats)
// hp/xp xp/hit xp/s hp/g g/hit g/h dps/k
// min hit, max hit consider crit.
// consider levels of monster.

import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { GMonster, MonsterKey } from "typed-adventureland";
import { useContext } from "react";
import { GDataContext } from "../GDataContext";

// Object.entries(G.npcs).filter(([key,npc])=>npc.name === 'Caroline')
export function Monsters() {
    const G = useContext(GDataContext);

    if (!G) {
        return <>WAITING!</>;
    }

    // TODO: columns
    // TODO: do the heavy row calculations here and map a new object with min and max gold for example.
    const rows: [MonsterKey, GMonster][] = Object.entries(G.monsters).sort(
        ([aKey, aValue], [bKey, bValue]) => aValue.name.localeCompare(bValue.name),
    ) as [MonsterKey, GMonster][];
    // G.drops.monsters.goo
    // monsters does not contain gold, where does that come from?
    // sub table with spawn locations?
    return (
        <>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell></TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>HP</TableCell>
                        <TableCell>GOLD</TableCell>
                        <TableCell>HP/GOLD</TableCell>
                        <TableCell>XP</TableCell>
                        <TableCell>XP/HP</TableCell>
                        <TableCell>respawn</TableCell>
                        <TableCell>armor</TableCell>
                        <TableCell>resistance</TableCell>
                        <TableCell>evasion</TableCell>
                        <TableCell>reflection</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map(([monsterKey, row]) => {
                        const base_gold = G.base_gold[monsterKey];
                        console.log(monsterKey, base_gold);
                        // const goldPerMapString = base_gold
                        //   ? Object.entries(base_gold).map(([map, gold]) => (
                        //       <TableRow>
                        //         <TableCell width={150}>{map}</TableCell>
                        //         <TableCell width={50} align="right">
                        //           {gold}
                        //         </TableCell>
                        //       </TableRow>
                        //     ))
                        //   : // .map(([map, gold]) => `${map}:${gold}`)
                        //     // .join("\n")
                        //     "";
                        const goldPerMapString = base_gold
                            ? Object.entries(base_gold)
                                  .map(([map, gold]) => `${map}:${gold}`)
                                  .join("\n")
                            : "";

                        const goldValues = base_gold ? Object.values(base_gold) : ([] as number[]);
                        const minGold = Math.min(...goldValues);
                        const maxGold = Math.max(...goldValues);

                        let goldString = "";
                        if (minGold >= 0 && minGold < maxGold) {
                            goldString = `${minGold} - ${maxGold}`;
                        } else if (minGold >= 0 && minGold === maxGold) {
                            goldString = minGold.toString();
                        }
                        // TODO: render farming spots, with mob count and respawn time.
                        return (
                            <TableRow key={monsterKey} hover>
                                <TableCell>{monsterKey}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.hp}</TableCell>
                                <TableCell title={goldPerMapString}>{goldString}</TableCell>
                                <TableCell>
                                    {minGold ? (row.hp / minGold).toFixed(2) : ""} - &nbsp;
                                    {maxGold ? (row.hp / maxGold).toFixed(2) : ""}
                                </TableCell>
                                <TableCell>{row.xp}</TableCell>
                                <TableCell>{(row.xp / row.hp).toFixed(2)}</TableCell>
                                <TableCell>{row.respawn}</TableCell>
                                <TableCell>{row.armor}</TableCell>
                                <TableCell>{row.resistance}</TableCell>
                                <TableCell>{row.evasion}</TableCell>
                                <TableCell>{row.reflection}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </>
    );
}

// const monsterImage = $(parent.sprite_image(quest.monsterhunt.id)).css({
//     position: "relative",
//     left: "-4px",
//     top: "-40px",
//   });

// Thanks to WarEagle for pointing me in the direction of precompute_image_positions and sprite_image

// function precompute_image_positions()
// {
// 	// G.images is new [25/09/18]
// 	if(IID) return;
// 	if(!window.SS) window.SS={},window.SSU={};
// 	if(!Object.keys(T).length) process_game_data();
// 	IID={}; // IID is reset after game loads, so actual dimensions are live
// 	for(var name in G.sprites)
// 	{
// 		var s_def=G.sprites[name];
// 		if(s_def.skip) continue;
// 		var row_num=4,col_num=3,s_type="full";
// 		if(in_arr(s_def.type,["animation"])) row_num=1,s_type=s_def.type;
// 		if(in_arr(s_def.type,["tail"])) col_num=4,s_type=s_def.type;
// 		if(in_arr(s_def.type,["v_animation","head","hair","hat","s_wings","face","makeup","beard"])) col_num=1,s_type=s_def.type;
// 		if(in_arr(s_def.type,["a_makeup","a_hat"])) col_num=3,s_type=s_def.type;
// 		if(in_arr(s_def.type,["wings","body","armor","skin","character"])) s_type=s_def.type;
// 		if(in_arr(s_def.type,["emblem","gravestone"])) row_num=1,col_num=1,s_type=s_def.type;
// 		var matrix=s_def.matrix;
// 		var width=G.images[s_def.file.split("?")[0]]&&G.images[s_def.file.split("?")[0]].width||s_def.width||window.C&&C[s_def.file]&&C[s_def.file].width||312;
// 		var height=G.images[s_def.file.split("?")[0]]&&G.images[s_def.file.split("?")[0]].height||s_def.height||window.C&&C[s_def.file]&&C[s_def.file].height||288;
// 		// if(s_def.columns!=4 || s_def.rows!=2) continue;
// 		for(var i=0;i<matrix.length;i++)
// 			for(var j=0;j<matrix[i].length;j++)
// 			{
// 				var name=matrix[i][j];
// 				if(!name) continue;
// 				// 0 total-width,  1 total-height, 2 X-start, 3 Y-start, 4 width, 5 height, 6 col_num, 7 file, 8 type
// 				IID[name]=[width,height,j*width/s_def.columns,i*height/s_def.rows,width/(s_def.columns*col_num),height/(s_def.rows*row_num),col_num,s_def.file,s_type];
// 				T[name]=s_def.type;
// 				SSU[name]=SS[name]=s_def.size||"normal";
// 				if(G.cosmetics.prop[name] && G.cosmetics.prop[name].includes("slender")) SSU[name]+="slender";
// 				if(G.dimensions[name])
// 				{
// 					//IID[name][4]=G.dimensions[name][0]; - not for here, maybe to replace the default 39 50
// 					//IID[name][5]=G.dimensions[name][1];
// 					IID[name][2]=IID[name][2]+(G.dimensions[name][2]||0); // instead of 6 width-disp
// 				}
// 			}
// 	}
// 	if(0)
// 		for(var name in IID)
// 		{
// 			for(var j=0;j<IID[name].length-1;j++) IID[name][j]*=1.5;
// 		}
// }

// function sprite_image(name,args)
// {
// 	try{
// 		precompute_image_positions();
// 		if(!args) args={};
// 		args.p=args.p||0;
// 		args.rheight=args.rheight||0; // height reduction for cx.upper
// 		if(!IID[name]) name="naked";
// 		var scale=args.scale||1,css='';
// 		// previously, the default width/height was 39px/50px [26/09/18]
// 		var width=IID[name][4],w_disp=0,l_disp=0,j=args.j||0;
// 		var height=IID[name][5];
// 		if(args.cwidth) l_disp=(args.cwidth-width*scale)/2;
// 		// l_disp=parseInt(l_disp); // currently, on Chrome, -0.25, 0.5 px corrections etc. look bad [02/10/18]
// 		if(IID[name][6]==1) w_disp=width;
// 		if(args.opacity && args.opacity!=1) css+="opacity: "+args.opacity+";"
// 		return "<div style='display: inline-block; width: "+(width*scale)+"px; height: "+((height-args.rheight)*scale)+"px; overflow: hidden; position: absolute; left: "+l_disp+"px; bottom: "+((args.p+args.rheight)*scale)+"px; "+css+"'>\
// 			<img style='\
// 			margin-left: "+((-IID[name][2]-IID[name][4]+w_disp-(IID[name][4]-width+(args.x_disp||0))/2)*scale)+"px; \
// 			margin-top: "+((-IID[name][3]-IID[name][5]-IID[name][5]*j+height)*scale)+"px; \
// 			width: "+(IID[name][0]*scale)+"px; \
// 			height: "+(IID[name][1]*scale)+"px;' \
// 		src='"+IID[name][7]+"'/></div>";
// 		// Math.ceil((IID[name][4]-width)/2)
// 	}
// 	catch(e){
// 		console.log(e);
// 	}
// 	return "";
// }
