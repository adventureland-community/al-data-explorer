export type ObjectEntries<Terface> = Array<[keyof Terface, Terface[keyof Terface]]>;
export type ObjectKeys<Terface> = Array<keyof Terface>;
export type ObjectValues<Terface> = Array<Terface[keyof Terface]>;

// eslint-disable-next-line @typescript-eslint/ban-types
export function objectEntries<Terface extends {}>(obj: Terface) {
  return Object.entries(obj) as ObjectEntries<Terface>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function objectKeys<Terface extends {}>(obj: Terface) {
  return Object.keys(obj) as ObjectKeys<Terface>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function objectValues<Terface extends {}>(obj: Terface) {
  return Object.values(obj) as ObjectValues<Terface>;
}
