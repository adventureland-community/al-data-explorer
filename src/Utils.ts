import { CharacterEntity, StatType } from "typed-adventureland";
import { GData } from "typed-adventureland";
import { GItem } from "typed-adventureland";

export function getMaxLevel(gItem: { upgrade?: any; compound?: any }) {
    if (gItem.upgrade) {
        return 12;
    }

    if (gItem.compound) {
        return 7;
    }
}

export function getLevelString(gItem: GItem, level?: number) {
    if (gItem.upgrade) {
        const maxLevel = getMaxLevel(gItem);
        level = maxLevel ? Math.min(level ?? 0, maxLevel) : level;

        switch (level) {
            case 12:
                return "+Z";
            case 11:
                return "+Y";
            case 10:
                return "+X";
            default:
                return level;
        }
    }

    if (gItem.compound) {
        if (level && level > 7) {
            level = 7;
        }

        switch (level) {
            case 7:
                return "+R";
            case 6:
                return "+S";
            case 5:
                return "+V";
            default:
                return level;
        }
    }
}

export function calculateItemStatsByLevel(def: GItem, itemLevel?: number, statType?: StatType) {
    // TODO: should be an object resembling ItemInfo, an actual item.
    const stats: { [T in StatType]?: number } = {};
    // TODO: base stats from item
    // compound / upgrade contains the stats gained for each level
    Object.entries(def).forEach(([key, value]) => {
        const stat = key as StatType;
        // just add all numbers as a stat, can probably verify stat types later, or hardcode them.
        if (typeof value === "number") {
            stats[stat] = value;
        }
    });

    // TODO: shiny, glitched, titles outside level loop

    if (def.upgrade || def.compound) {
        const u_def: { [T in StatType]?: number } = def.upgrade ?? def.compound ?? {};

        for (let level = 1; level <= (itemLevel ?? 0); level++) {
            let multiplier = 1;
            if (def.upgrade) {
                if (level === 7) multiplier = 1.25;
                if (level === 8) multiplier = 1.5;
                if (level === 9) multiplier = 2;
                if (level === 10) multiplier = 3;
                if (level === 11) multiplier = 1.25;
                if (level === 12) multiplier = 1.25;
            } else if (def.compound) {
                if (level === 5) multiplier = 1.25;
                if (level === 6) multiplier = 1.5;
                if (level === 7) multiplier = 2;
                if (level >= 8) multiplier = 3;
            }

            let p: StatType;
            for (p in u_def) {
                const value = u_def ? u_def[p] ?? 0 : 0;
                if (p === "stat") {
                    stats[p] = (stats[p] ?? 0) + Math.round(value * multiplier);
                    if (level >= 7) stats[p] = (stats[p] ?? 0) + 1;
                } else {
                    stats[p] = (stats[p] ?? 0) + value * multiplier;
                }
            }
        }
    }

    if (itemLevel === 10 && def.tier && def.tier >= 3) {
        stats.stat = (stats.stat ?? 0) + 2;
    }

    // TODO: Legacy

    // Round stat properties
    let p: StatType;
    for (p in stats) {
        const shouldRoundValue = ![
            "evasion",
            "miss",
            "reflection",
            "dreturn",
            "lifesteal",
            "manasteal",
            "attr0",
            "attr1",
            "crit",
            "critdamage",
            "set",
            "class",
            "breaks",
        ].some((x) => x === p);

        if (shouldRoundValue) {
            const value = stats[p];
            stats[p] = value ? Math.round(value) : 0;
        }
    }

    // Add stats modifier
    if (def.stat && statType) {
        const multiplier = stat_type_multiplier[statType] ?? 0;
        stats[statType] = (stats[statType] ?? 0) + (stats.stat ?? 0) * multiplier;
    }

    /**
     * 0 <= 15 loops if compound or upgrade
     * if(calculate_item_grade(G.items[name],{level:i})==4) break;
     * seems to break if item grade is 4
     * html+="<div style='display: inline-block; margin: 5px'>"+render_item("html",{item:G.items[name],actual:{level:i,name:name},guide:true})+"</div>";
     * notice a level is supplied to the render_item method
     *
     * if(item.upgrade && prop.level==12) item_name+=" +Z";
     * else if(item.upgrade && prop.level==11) item_name+=" +Y";
     * else if(item.upgrade && prop.level==10) item_name+=" +X";
     * else if(item.compound && prop.level==7) item_name+=" +R";
     * else if(item.compound && prop.level==6) item_name+=" +S";
     * else if(item.compound && prop.level==5) item_name+=" +V";
     * else item_name+=" +"+prop.level;
     *
     * var prop=args.prop||calculate_item_properties(actual||{},{def:item,'class':window.character&&character.ctype,'map':window.character&&character.map}),grade=calculate_item_grade(item,actual||{});
     * calculate_item_properties resides in common_functions
     *
     *
     *
     *
     */

    return stats;
}

const statTypes: string[] /*StatType[] */ = [
    "gold",
    "luck",
    "xp",
    "int",
    "str",
    "dex",
    "vit",
    "for",
    "charisma",
    "cuteness",
    "awesomeness",
    "bling",
    "hp",
    "mp",
    "attack",
    "range",
    "armor",
    "resistance",
    "pnresistance",
    "firesistance",
    "fzresistance",
    "stun",
    "blast",
    "explosion",
    "breaks",
    "stat",
    "speed",
    "level",
    "evasion",
    "miss",
    "reflection",
    "lifesteal",
    "manasteal",
    "attr0",
    "attr1",
    "rpiercing",
    "apiercing",
    "crit",
    "critdamage",
    "dreturn",
    "frequency",
    "mp_cost",
    "mp_reduction",
    "output",
    "courage",
    "mcourage",
    "pcourage",
];

const stat_type_multiplier: { [T in StatType]?: number } = {
    gold: 0.5,
    luck: 1,
    xp: 0.5,
    int: 1,
    str: 1,
    dex: 1,
    vit: 1,
    for: 1,
    armor: 2.25,
    resistance: 2.25,
    speed: 0.325,
    evasion: 0.325,
    reflection: 0.15,
    lifesteal: 0.15,
    manasteal: 0.04,
    rpiercing: 2.25,
    apiercing: 2.25,
    crit: 0.125,
    dreturn: 0.5,
    frequency: 0.325,
    mp_cost: -0.6,
    output: 0.175,
};

// function adopt_extras(def,ex)
// {
// 	for(var p in ex)
// 	{
// 		if(p=='upgrade' || p=='compound')
// 		{
// 			for(var pp in ex)
// 			{
// 				def[p][pp]=(def[p][pp]||0)+ex[p][pp];
// 			}
// 		}
// 		else
// 			def[p]=(def[p]||0)+ex[p];
// 	}
// }

// function calculate_item_properties(item,args)
// {
// 	if(!args) args={};
// 	var def=args.def||G.items[item.name],cls="",map="";
// 	if(args['class'] && def[args['class']]) cls=args['class'];
// 	if(args['map'] && def[args['map']]) map=args['map'];
// 	var prop_key=def.name+item.name+(def.card||"")+"|"+item.level+"|"+item.stat_type+"|"+item.p+"|"+cls+"|"+map;
// 	if(prop_cache[prop_key]) return prop_cache[prop_key];
// 	if(cls || map) def=clone(def);
// 	if(cls) adopt_extras(def,def[cls]);
// 	if(map) adopt_extras(def,def[map]);
// 	//#NEWIDEA: An item cache here [15/11/16]
// 	var prop={
// 		"gold":0,
// 		"luck":0,
// 		"xp":0,
// 		"int":0,
// 		"str":0,
// 		"dex":0,
// 		"vit":0,
// 		"for":0,
// 		"charisma":0,
// 		"cuteness":0,
// 		"awesomeness":0,
// 		"bling":0,
// 		"hp":0,
// 		"mp":0,
// 		"attack":0,
// 		"range":0,
// 		"armor":0,
// 		"resistance":0,
// 		"pnresistance":0,
// 		"firesistance":0,
// 		"fzresistance":0,
// 		"stun":0,
// 		"blast":0,
// 		"explosion":0,
// 		"breaks":0,
// 		"stat":0,
// 		"speed":0,
// 		"level":0,
// 		"evasion":0,
// 		"miss":0,
// 		"reflection":0,
// 		"lifesteal":0,
// 		"manasteal":0,
// 		"attr0":0,
// 		"attr1":0,
// 		"rpiercing":0,
// 		"apiercing":0,
// 		"crit":0,
// 		"critdamage":0,
// 		"dreturn":0,
// 		"frequency":0,
// 		"mp_cost":0,
// 		"mp_reduction":0,
// 		"output":0,
// 		"courage":0,
// 		"mcourage":0,
// 		"pcourage":0,
// 		"set":null,
// 		"class":null,
// 	};
// 	var mult={
// 		"gold":0.5,
// 		"luck":1,
// 		"xp":0.5,
// 		"int":1,
// 		"str":1,
// 		"dex":1,
// 		"vit":1,
// 		"for":1,
// 		"armor":2.25,
// 		"resistance":2.25,
// 		"speed":0.325,
// 		"evasion":0.325,
// 		"reflection":0.150,
// 		"lifesteal":0.15,
// 		"manasteal":0.040,
// 		"rpiercing":2.25,
// 		"apiercing":2.25,
// 		"crit":0.125,
// 		"dreturn":0.5,
// 		"frequency":0.325,
// 		"mp_cost":-0.6,
// 		"output":0.175,
// 	};
// 	if(item.p=="shiny")
// 	{
// 		if(def.attack)
// 		{
// 			prop.attack+=4;
// 			if(doublehand_types.includes(G.items[item.name].wtype)) prop.attack+=3;
// 		}
// 		else if(def.stat)
// 		{
// 			prop.stat+=2;
// 		}
// 		else if(def.armor)
// 		{
// 			prop.armor+=12;
// 			prop.resistance=(prop.resistance||0)+10;
// 		}
// 		else
// 		{
// 			prop.dex+=1;
// 			prop['int']+=1;
// 			prop.str+=1;
// 		}
// 	}
// 	else if(item.p=="glitched")
// 	{
// 		var roll=Math.random();
// 		if(roll<0.33)
// 		{
// 			prop.dex+=1;
// 		}
// 		else if(roll<0.66)
// 		{
// 			prop['int']+=1;
// 		}
// 		else
// 		{
// 			prop.str+=1;
// 		}
// 	}
// 	else if(item.p && G.titles[item.p])
// 	{
// 		for(var p in G.titles[item.p])
// 			if(p in prop)
// 				prop[p]+=G.titles[item.p][p];
// 	}
// 	if(def.upgrade||def.compound)
// 	{
// 		var u_def=def.upgrade||def.compound;
// 		level=item.level||0;
// 		prop.level=level;
// 		for(var i=1;i<=level;i++)
// 		{
// 			var multiplier=1;
// 			if(def.upgrade)
// 			{
// 				if(i==7) multiplier=1.25;
// 				if(i==8) multiplier=1.5;
// 				if(i==9) multiplier=2;
// 				if(i==10) multiplier=3;
// 				if(i==11) multiplier=1.25;
// 				if(i==12) multiplier=1.25;
// 			}
// 			else if(def.compound)
// 			{
// 				if(i==5) multiplier=1.25;
// 				if(i==6) multiplier=1.5;
// 				if(i==7) multiplier=2;
// 				if(i>=8) multiplier=3;
// 			}
// 			for(p in u_def)
// 			{
// 				if(p=="stat") prop[p]+=round(u_def[p]*multiplier);
// 				else prop[p]+=u_def[p]*multiplier; // for weapons with float improvements [04/08/16]
// 				if(p=="stat" && i>=7) prop.stat++;
// 			}
// 		}

// 	}
// 	if(item.level==10 && prop.stat && def.tier && def.tier>=3) prop.stat+=2;
// 	for(p in def)
// 		if(prop[p]===null) prop[p]=def[p];
// 		else if(prop[p]!=undefined) prop[p]+=def[p];
// 	if(item.p=="legacy" && def.legacy)
// 	{
// 		for(var name in def.legacy)
// 		{
// 			if(def.legacy[name]===null) delete prop[name];
// 			else prop[name]=(prop[name]||0)+def.legacy[name];
// 		}
// 	}
// 	for(p in prop)
// 		if(!in_arr(p,["evasion","miss","reflection","dreturn","lifesteal","manasteal","attr0","attr1","crit","critdamage","set","class","breaks"])) prop[p]=round(prop[p]);
// 	if(def.stat && item.stat_type)
// 	{
// 		prop[item.stat_type]+=prop.stat*mult[item.stat_type];
// 		prop.stat=0;
// 	}
// 	// for(p in prop) prop[p]=floor(prop[p]); - round probably came after this one, commenting out [13/09/16]
// 	prop_cache[prop_key]=prop;
// 	return prop;
// }

// from wizard screenshot
/**
 There are caps at certain stat calculations, might want to highlight them in the gear planner
 */
function wizard_calc_stats(player: CharacterEntity, G: GData) {
    let player_attack = 0; // no idea what this value is
    let item_attack = 0; // no idea what this value is
    if (
        player.slots.mainhand &&
        player.slots.offhand &&
        G.items[player.slots.mainhand.name].wtype == "stars" &&
        G.items[player.slots.offhand.name].wtype != "stars"
    ) {
        item_attack /= 3.0;
    }

    if (player.slots.cape && player.slots.cape.name == "stealthcape") {
        // player.stealth = true;
    }

    item_attack = Math.max(item_attack, 5); // technically there is a max wrapper function, I assume it just wraps math

    if (player.ctype == "paladin") {
        // player_attack += item_attack * (player.str / 20.0 + player.int / 40.0);
        // player.pcourage += Math.round(player.str/30+player.int/30)
    } else {
        // player.attack = player.a_attack
    }

    if (player.ctype == "priest") {
        player.attack *= 1.6;
        // player.mcourage += Math.round(player.int/30)
    }

    if (player.ctype == "warrior") {
        // player.courage += Math.round(player.str/30)
    }

    // player.speed =
    //   Math.min(player.dex, 256) / 32.0 +
    //   Math.min(player.str, 256) / 64.0 +
    //   Math.min(player.level, 40) / 10.0 +
    //   Math.max(0, Math.min(player.level - 40, 20)) / 15.0 +
    //   Math.max(0, Math.min(86, player.level - 60)) / 16.0;

    // player.aggro_diff = player.bling / 100 - player.cuteness / 100;

    // player.max_hp += player.str * 21 + player.vit * (48 + player.leel / 3.0);
    // player.max_hp = Math.max(1, player.max_hp)

    // player.max_mp += player.int * 15 + player.level * 5;

    // player.armor +=
    //   Math.min(player.str, 160) + Math.max(0, player.str - 160) * 0.25;

    // player.resistance +=
    //   Math.min(player.int, 180) + Math.max(0, player.int - 180) * 0.25;

    // player.frequency +=
    //   Math.min(player.level, 80) / 164.0 +
    //   Math.min(160, player.dex) / 640.0 +
    //   Math.max(player.dex - 160) / 925.0 +
    //   player.int / 1575.0;

    // player.attack_ms = Math.round(1000.0/player.frequency)
}

export function modifyPlayerStatsByAttributes(
    level: number,
    player: {
        [T in StatType]?: number;
    },
) {
    // TODO: hp shows as 644, but my stat recording was 624, where does the extra 20 come from?
    player.hp = calculatePlayerMaxHealthPoint({
        max_hp: player.hp ?? 0,
        str: player.str ?? 0,
        vit: player.vit ?? 0,
        level,
    });

    // TODO: recording shows 55, but calculation is 59, where i the extra 4 from?
    player.mp = calculatePlayerMaxManaPoint({
        level,
        max_mp: player.mp ?? 0,
        int: player.int ?? 0,
    });

    player.frequency = calculatePlayerFrequency({
        level,
        frequency: player.frequency ?? 0,
        dex: player.dex ?? 0,
        int: player.int ?? 0,
    });

    player.armor = calculatePlayerArmor({
        armor: player.armor ?? 0,
        str: player.str ?? 0,
    });

    player.resistance = calculatePlayerResistance({
        resistance: player.resistance ?? 0,
        int: player.int ?? 0,
    });

    // todo: speed
    player.speed =
        (player.speed ?? 0) +
        calculatePlayerSpeed({
            dex: player.dex ?? 0,
            str: player.str ?? 0,
            level,
        });
}

export function calculatePlayerFrequency(player: {
    frequency: number;
    level: number;
    dex: number;
    int: number;
}) {
    return (
        player.frequency +
        Math.min(player.level, 80) / 164.0 +
        Math.min(160, player.dex) / 640.0 +
        Math.max(player.dex - 160) / 925.0 +
        player.int / 1575.0
    );
}

export function calculatePlayerResistance(player: { resistance: number; int: number }) {
    return player.resistance + Math.min(player.int, 180) + Math.max(0, player.int - 180) * 0.25;
}
export function calculatePlayerArmor(player: { armor: number; str: number }) {
    return player.armor + Math.min(player.str, 160) + Math.max(0, player.str - 160) * 0.25;
}
export function calculatePlayerMaxHealthPoint(player: {
    /** the current hp from items giving hp directly, and base class */
    max_hp: number;
    str: number;
    vit: number;
    level: number;
}) {
    return Math.max(1, player.max_hp + player.str * 21 + player.vit * (48 + player.level / 3.0));
}

export function calculatePlayerMaxManaPoint(player: {
    /** the current max_mp from items giving hp directly, and base class */
    max_mp: number;
    level: number;
    int: number;
}) {
    return player.max_mp + player.int * 15 + player.level * 5;
}

export function calculatePlayerSpeed(player: { dex: number; str: number; level: number }) {
    return (
        Math.min(player.dex, 256) / 32.0 +
        Math.min(player.str, 256) / 64.0 +
        Math.min(player.level, 40) / 10.0 +
        Math.max(0, Math.min(player.level - 40, 20)) / 15.0 +
        Math.max(0, Math.min(86, player.level - 60)) / 16.0
    );
}
