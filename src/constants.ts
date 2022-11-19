import { ClassKey } from "adventureland/dist/src/types/GTypes/classes";

export const CLASS_COLOR_NUMBER: { [type in ClassKey]: number } = {
  merchant: 0x7f7f7f,
  mage: 0x3e6eed,
  warrior: 0xf07f2f,
  priest: 0xeb4d82,
  ranger: 0x8a512b,
  paladin: 0xa3b4b9,
  rogue: 0x44b75c,
};

export const CLASS_COLOR: { [type in ClassKey]: string } = {
    merchant: '#7f7f7f',
    mage: '#3e6eed',
    warrior: '#f07f2f',
    priest: '#eb4d82',
    ranger: '#8a512b',
    paladin: '#a3b4b9',
    rogue: '#44b75c',
  };
