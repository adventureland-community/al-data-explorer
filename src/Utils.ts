import { GItem, StatType } from "adventureland";

export const calculateItemStatsByLevel = (gItem: GItem, level?: number) => {
  const stats: { [T in StatType]?: number } = {};
  // TODO: base stats from item
  // compound / upgrade contains the stats gained for each level
  Object.entries(gItem).forEach(([key, value]) => {
    const stat = key as StatType;
    // just add all numbers as a stat, can probably verify stat types later, or hardcode them.
    if (typeof value === "number") {
      stats[stat] = value;
    }
  });

  const upgradeDefinition = { ...gItem.upgrade, ...gItem.compound };

  if (level && level > 0) {
    let multiplier = 1;
    if (gItem.upgrade) {
      if (level === 7) multiplier = 1.25;
      if (level === 8) multiplier = 1.5;
      if (level === 9) multiplier = 2;
      if (level === 10) multiplier = 3;
      if (level === 11) multiplier = 1.25;
      if (level === 12) multiplier = 1.25;
    } else if (gItem.compound) {
      if (level === 5) multiplier = 1.25;
      if (level === 6) multiplier = 1.5;
      if (level === 7) multiplier = 2;
      if (level >= 8) multiplier = 3;
    }

    Object.entries(upgradeDefinition).forEach(([key, value]) => {
      const stat = key as StatType;
      ////if(stat=="stat") prop[p]+=round(u_def[p]*multiplier);
      ////else prop[p]+=u_def[p]*multiplier; // for weapons with float improvements [04/08/16]
      ////if(p=="stat" && i>=7) prop.stat++;

      stats[stat] = (stats[stat] ?? 0) + value * multiplier;
      // TODO +7 helmet seems to scale differently, stats is 9 instead of 8
      // it seems like when the item goes high grade it scales x 2
      // grades are located in grades array
      // +8 has 12 stats that is 2 x 2 + 8
      // rare +9 helmet has 15 stats, now it's *3 increments of stats.
      // assume that each grade is multipled by index + 1
      // something is definately funky.
    });
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
