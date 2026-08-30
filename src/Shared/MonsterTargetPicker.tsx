import { MonsterKey } from "typed-adventureland";
import { useMemo } from "react";

import { CustomGData } from "../GDataContext";
import { SimEntityAutocomplete } from "../DropSimulator/SimEntityAutocomplete";

export function MonsterTargetPicker({
  G,
  value,
  onChange,
  label = "Target",
}: {
  G: CustomGData;
  value: MonsterKey;
  onChange: (key: MonsterKey) => void;
  label?: string;
}) {
  const options = useMemo(
    () =>
      Object.keys(G.monsters).sort((a, b) => {
        const nameA = G.monsters[a as MonsterKey]?.name ?? a;
        const nameB = G.monsters[b as MonsterKey]?.name ?? b;
        return nameA.localeCompare(nameB);
      }) as MonsterKey[],
    [G.monsters],
  );

  return (
    <SimEntityAutocomplete
      options={options}
      value={value}
      label={label}
      onChange={(next) => {
        if (next) onChange(next);
      }}
      getOptionLabel={(key) => G.monsters[key]?.name ?? key}
      getPrimaryLabel={(key) => G.monsters[key]?.name ?? key}
      getSecondaryLabel={(key) => {
        const m = G.monsters[key];
        if (!m) return key;
        const parts: string[] = [];
        if (m.hp != null) parts.push(`HP ${m.hp.toLocaleString()}`);
        if (m.armor != null) parts.push(`armor ${m.armor}`);
        if (m.resistance != null) parts.push(`res ${m.resistance}`);
        if (m.attack != null) parts.push(`atk ${m.attack}`);
        return parts.join(" · ");
      }}
      filterOption={(key, query) => {
        const m = G.monsters[key];
        const hay = `${key} ${m?.name ?? ""}`.toLowerCase();
        return hay.includes(query);
      }}
      renderListIcon={() => (
        <span role="img" aria-label="monster">
          👾
        </span>
      )}
    />
  );
}
