import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { GSkill } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import {
  getCondition,
  skillAuraStates,
  skillExtra,
  skillRankLevels,
} from "../gameData/classSkills";
import { SkinImage } from "../ItemImage";

export function SkillAuraPanel({ skill, G }: { skill: GSkill; G: CustomGData }) {
  const extra = skillExtra(skill);
  const ranks = skillRankLevels(skill);
  const states = skillAuraStates(skill);
  if (states.length === 0) return null;

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="overline" sx={{ display: "block", mb: 1.5, opacity: 0.7 }}>
        Aura forms
      </Typography>
      <Stack spacing={2.5}>
        {states.map((state) => {
          const condition = state.condition
            ? getCondition(G.conditions, state.condition)
            : undefined;
          const isDefault = extra.default_state === state.key;
          const skin = condition?.skin ?? skill.skin;
          return (
            <Box key={state.key}>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                {skin ? <SkinImage skin={skin} size={36} alt={state.name} /> : null}
                <Box sx={{ minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    sx={{ flexWrap: "wrap", gap: 0.5 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {state.name}
                    </Typography>
                    {isDefault && <Chip size="small" label="Default" variant="outlined" />}
                  </Stack>
                  {state.condition && condition?.name && condition.name !== state.name && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {condition.name}
                    </Typography>
                  )}
                </Box>
              </Stack>
              {state.values.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ pl: 0 }} />
                      {ranks.map((level) => (
                        <TableCell
                          key={level}
                          align="right"
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {level}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {state.values.map((row) => (
                      <TableRow key={row.stat}>
                        <TableCell sx={{ pl: 0, color: "text.secondary" }}>{row.label}</TableCell>
                        {row.ranks.map((amount, index) => (
                          <TableCell
                            key={`${row.stat}-${ranks[index] ?? index}`}
                            align="right"
                            sx={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {amount}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
