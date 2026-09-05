import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import {
  formatMpReturnRatio,
  formatSkillLevelValue,
  formatSkillMs,
  formatWtype,
  getCondition,
  getSkill,
  skillEssenceItems,
  skillExtra,
  skillFlagLabels,
  skillHeroStats,
  skillKind,
  skillLevelRows,
  skillMpReturnRows,
  skillsExclusiveWith,
  skillsSharingCondition,
  skillsSharingCooldown,
  SKILL_KIND_LABELS,
  SkillRow,
  titleCaseKey,
} from "../gameData/classSkills";
import { STAT_DISPLAY_LABELS } from "../gameData/statLabels";
import { SkinImage } from "../ItemImage";
import { ItemInstance } from "../Shared/ItemInstance";
import { LoadingState } from "../Shared/LoadingState";
import { ClassChip, KindChip } from "./ClassChip";
import { SkillAuraPanel } from "./SkillAuraPanel";
import { SkillImage } from "./SkillImage";

type SkillFact = { key: string; label: string; value: string; href?: string };

const HERO_FACT_KEYS = new Set([
  "mp",
  "cooldown",
  "reuse_cooldown",
  "range",
  "damage",
  "ratio",
  "duration",
  "duration_min",
  "duration_max",
]);

function FactsTable({ rows }: { rows: SkillFact[] }) {
  if (rows.length === 0) return null;
  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell
                sx={{
                  color: "text.secondary",
                  width: 140,
                  py: 0.45,
                  px: 0,
                  borderColor: "transparent",
                  verticalAlign: "top",
                }}
              >
                {row.label}
              </TableCell>
              <TableCell sx={{ py: 0.45, px: 0, pl: 1.5, borderColor: "transparent" }}>
                {row.href ? (
                  <Link component={RouterLink} to={row.href} underline="hover">
                    {row.value}
                  </Link>
                ) : (
                  row.value
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function pushFact(rows: SkillFact[], key: string, label: string, value: unknown, href?: string) {
  if (value == null || value === "" || value === false) return;
  if (HERO_FACT_KEYS.has(key)) return;
  rows.push({ key, label, value: String(value), href });
}

const relatedLinkSx = {
  display: "flex",
  alignItems: "center",
  gap: 1.25,
  textDecoration: "none",
  color: "inherit",
} as const;

function relatedSkillCaption(row: SkillRow): string {
  const bits: string[] = [];
  const classKey = row.skill.class?.[0];
  if (classKey) bits.push(titleCaseKey(classKey));
  else bits.push(SKILL_KIND_LABELS[row.kind]);
  if (row.skill.cooldown != null) bits.push(formatSkillMs(row.skill.cooldown));
  return bits.join(" · ");
}

function SkillLinkRow({ row, caption }: { row: SkillRow; caption?: string }) {
  return (
    <Box component={RouterLink} to={`/skills/${row.key}`} sx={relatedLinkSx}>
      <SkillImage skillKey={row.key} size={40} />
      <Box>
        <Typography variant="body2">{row.skill.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {caption ?? relatedSkillCaption(row)}
        </Typography>
      </Box>
    </Box>
  );
}

function ItemLinkRow({
  itemKey,
  name,
  caption,
}: {
  itemKey: string;
  name: string;
  caption?: string;
}) {
  return (
    <Box component={RouterLink} to={`/items/${itemKey}`} sx={relatedLinkSx}>
      <ItemInstance itemInfo={{ name: itemKey as ItemKey }} />
      <Box>
        <Typography variant="body2">{name}</Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function conditionBonusLines(condition: Record<string, unknown>): string[] {
  const skip = new Set([
    "skin",
    "name",
    "ui",
    "buff",
    "debuff",
    "aura",
    "explanation",
    "duration",
    "persistent",
    "cleansable",
  ]);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(condition)) {
    if (skip.has(key) || value == null || value === false) continue;
    if (typeof value === "number") {
      lines.push(`${STAT_DISPLAY_LABELS[key] ?? titleCaseKey(key)} ${value}`);
    }
  }
  return lines;
}

export function SkillDetail() {
  const { skillKey } = useParams<{ skillKey: string }>();
  const [searchParams] = useSearchParams();
  const G = useContext(GDataContext);

  const skill = skillKey && G ? getSkill(G.skills, skillKey) : undefined;
  const kind = skill ? skillKind(skill) : undefined;
  const flags = useMemo(() => (skill ? skillFlagLabels(skill) : []), [skill]);
  const hero = useMemo(() => (skill ? skillHeroStats(skill) : []), [skill]);

  const facts = useMemo(() => {
    if (!skill || !G) return [];
    const rows: SkillFact[] = [];
    pushFact(rows, "range_bonus", "Range bonus", skill.range_bonus);
    pushFact(rows, "range_multiplier", "Range multiplier", skill.range_multiplier);
    pushFact(rows, "damage_multiplier", "Damage multiplier", skill.damage_multiplier);
    pushFact(rows, "damage_type", "Damage type", skill.damage_type);
    pushFact(rows, "output", "Output", skill.output);
    pushFact(rows, "apiercing", STAT_DISPLAY_LABELS.apiercing ?? "A.Piercing", skill.apiercing);
    const extra = skillExtra(skill);
    pushFact(rows, "armor_multiplier", "Armor ×", extra.armor_multiplier);
    pushFact(rows, "armor_cap", "Armor cap", extra.armor_cap);
    pushFact(rows, "link_range", "Link range", extra.link_range);
    pushFact(rows, "offhand_type", "Offhand", extra.offhand_type);
    pushFact(rows, "level", "Level", skill.level);
    pushFact(rows, "max", "Max", skill.max);
    pushFact(rows, "set_speed", "Set speed", skill.set_speed);
    pushFact(rows, "variance", "Variance", skill.variance);
    pushFact(rows, "projectile", "Projectile", skill.projectile);
    if (skill.target === true) pushFact(rows, "target", "Target", "required");
    else pushFact(rows, "target", "Target", skill.target);
    pushFact(rows, "use_range", "Uses attack range", skill.use_range ? "yes" : undefined);
    const wtype = formatWtype(skill.wtype);
    pushFact(rows, "wtype", "Weapon", wtype);
    if (skill.requirements) {
      const parts: string[] = [];
      for (const [stat, amount] of Object.entries(skill.requirements)) {
        if (amount == null) continue;
        parts.push(`${STAT_DISPLAY_LABELS[stat] ?? titleCaseKey(stat)} ${amount}`);
      }
      pushFact(rows, "requirements", "Requires", parts.join(" · "));
    }
    if (extra.cooldown_multiplier != null) {
      const hub = skill.share ? getSkill(G.skills, skill.share) : undefined;
      const scale = `×${extra.cooldown_multiplier}`;
      pushFact(
        rows,
        "cooldown_multiplier",
        "Cooldown scale",
        hub ? `${scale} of ${hub.name}` : scale,
        skill.share ? `/skills/${skill.share}` : undefined,
      );
    }
    if (extra.nprop && extra.nprop.length > 0) {
      const parts: string[] = [];
      for (const stat of extra.nprop) {
        parts.push(STAT_DISPLAY_LABELS[stat] ?? titleCaseKey(stat));
      }
      pushFact(rows, "nprop", "Uses item stats", parts.join(" · "));
    }
    if (skill.action) pushFact(rows, "action", "Action", skill.action);
    return rows;
  }, [G, skill]);

  if (!G || !skillKey) {
    return <LoadingState />;
  }

  if (!skill) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography variant="h6" gutterBottom>
          Skill not found
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          {skillKey}
        </Typography>
        <Button component={RouterLink} to="/classes" sx={{ mt: 2 }}>
          Back to classes
        </Button>
      </Box>
    );
  }

  const backQuery = searchParams.get("from");
  const backTo = backQuery ? `/classes?${backQuery}` : "/classes";
  const extra = skillExtra(skill);
  const slotItems = skill.slot ?? [];
  const inventoryItems = extra.inventory ?? [];
  const cooldownGroup = skillsSharingCooldown(G.skills, skillKey);
  const sameCondition = skillsSharingCondition(G.skills, skillKey);
  const exclusiveSkills = skillsExclusiveWith(G.skills, skillKey);
  const essenceItems = skillEssenceItems(skill);
  const condition = skill.condition ? getCondition(G.conditions, skill.condition) : undefined;
  const exclusiveKey = extra.exclusive_condition;
  const exclusiveCondition =
    exclusiveKey && exclusiveSkills.length === 0
      ? getCondition(G.conditions, exclusiveKey)
      : undefined;
  const killBuff = extra.kill_buff ? getCondition(G.conditions, extra.kill_buff) : undefined;
  const mpReturn = skillMpReturnRows(skill);
  const levelRows = skillLevelRows(skill);
  const showTypeChip = Boolean(skill.type && kind && skill.type !== kind);
  const hasRelated =
    slotItems.length > 0 ||
    inventoryItems.length > 0 ||
    essenceItems.length > 0 ||
    Boolean(skill.consume) ||
    cooldownGroup.length > 0 ||
    Boolean(condition) ||
    exclusiveSkills.length > 0 ||
    Boolean(exclusiveCondition) ||
    Boolean(killBuff);
  const conditionExtras = condition as (typeof condition & { cleansable?: boolean }) | undefined;
  const conditionBonuses = condition
    ? conditionBonusLines(condition as unknown as Record<string, unknown>)
    : [];

  return (
    <Box sx={{ p: 2, maxWidth: mpReturn.length > 0 || extra.states ? 1100 : 960, mx: "auto" }}>
      <Button component={RouterLink} to={backTo} sx={{ mb: 1.5 }}>
        ← All skills
      </Button>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: hero.length > 0 ? "minmax(0, 1fr) minmax(160px, 220px)" : "1fr",
            },
            columnGap: 3,
            rowGap: 2,
            alignItems: "start",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ flexShrink: 0 }}>
              <SkillImage skillKey={skillKey} size={56} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-start"
                justifyContent="space-between"
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" component="h1" sx={{ lineHeight: 1.2 }}>
                    {skill.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {skillKey}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ flexWrap: "wrap", gap: 0.5, justifyContent: "flex-end" }}
                >
                  {kind && <KindChip kind={kind} />}
                  {showTypeChip && <Chip size="small" label={skill.type} variant="outlined" />}
                </Stack>
              </Stack>

              {skill.class && skill.class.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 1.25, flexWrap: "wrap", gap: 0.5 }}>
                  {skill.class.map((classKey) => (
                    <ClassChip key={classKey} classKey={classKey} />
                  ))}
                </Stack>
              )}

              {flags.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                  {flags.map((flag) => (
                    <Chip key={flag} size="small" label={flag} variant="outlined" />
                  ))}
                </Stack>
              )}

              {skill.explanation && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1.5, fontStyle: "italic", lineHeight: 1.5 }}
                >
                  {skill.explanation}
                </Typography>
              )}
              {skill.warning && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1, lineHeight: 1.5 }}>
                  {skill.warning}
                </Typography>
              )}
              {skill.complementary && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.5 }}>
                  {skill.complementary}
                </Typography>
              )}
            </Box>
          </Stack>

          {hero.length > 0 && (
            <Box
              sx={{
                borderLeft: { md: 1 },
                borderTop: { xs: 1, md: 0 },
                borderColor: "divider",
                pl: { md: 2.5 },
                pt: { xs: 1.5, md: 0 },
              }}
            >
              <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                Combat
              </Typography>
              <Stack spacing={1.15} divider={<Divider flexItem sx={{ borderColor: "divider" }} />}>
                {hero.map((stat) => (
                  <Box key={stat.key}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {stat.label}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Paper>

      {(facts.length > 0 || hasRelated) && (
        <Grid container spacing={2}>
          {facts.length > 0 && (
            <Grid item xs={12} md={hasRelated ? 7 : 12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="overline" sx={{ display: "block", mb: 0.5, opacity: 0.7 }}>
                  Details
                </Typography>
                <FactsTable rows={facts} />
              </Paper>
            </Grid>
          )}
          {hasRelated && (
            <Grid item xs={12} md={facts.length > 0 ? 5 : 12}>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={2} divider={<Divider flexItem />}>
                  {slotItems.length > 0 && (
                    <Box>
                      <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                        Required item
                      </Typography>
                      <Stack spacing={1}>
                        {slotItems.map(([slot, itemKey]) => (
                          <ItemLinkRow
                            key={`${slot}-${itemKey}`}
                            itemKey={itemKey}
                            name={G.items[itemKey]?.name ?? itemKey}
                            caption={slot}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {skill.consume && (
                    <Box>
                      <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                        Consumes
                      </Typography>
                      <ItemLinkRow
                        itemKey={skill.consume}
                        name={G.items[skill.consume]?.name ?? skill.consume}
                      />
                    </Box>
                  )}
                  {cooldownGroup.length > 0 && (
                    <Box>
                      <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                        Shares cooldown with
                      </Typography>
                      <Stack spacing={1}>
                        {cooldownGroup.map((row) => (
                          <SkillLinkRow key={row.key} row={row} />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {condition && skill.condition && (
                    <Box>
                      <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                        Condition
                      </Typography>
                      <Stack direction="row" spacing={1.25} alignItems="flex-start">
                        {condition.skin ? (
                          <SkinImage skin={condition.skin} size={40} alt={condition.name} />
                        ) : null}
                        <Box>
                          <Typography variant="body2">{condition.name}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {skill.condition}
                          </Typography>
                          {condition.explanation && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ mt: 0.5, lineHeight: 1.4 }}
                            >
                              {condition.explanation}
                            </Typography>
                          )}
                          {conditionBonuses.length > 0 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ mt: 0.5 }}
                            >
                              {conditionBonuses.join(" · ")}
                            </Typography>
                          )}
                          {conditionExtras?.cleansable && (
                            <Chip
                              size="small"
                              label="Cleansable"
                              variant="outlined"
                              sx={{ mt: 0.75, height: 20, fontSize: 10 }}
                            />
                          )}
                        </Box>
                      </Stack>
                      {sameCondition.length > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.75 }}
                          >
                            Also applied by
                          </Typography>
                          <Stack spacing={1}>
                            {sameCondition.map((row) => (
                              <SkillLinkRow key={row.key} row={row} />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  )}
                  {(exclusiveSkills.length > 0 || exclusiveCondition) && (
                    <Box>
                      <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                        Cannot coexist with
                      </Typography>
                      <Stack spacing={1}>
                        {exclusiveSkills.map((row) => (
                          <SkillLinkRow key={row.key} row={row} />
                        ))}
                        {exclusiveCondition && exclusiveKey && (
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            {exclusiveCondition.skin ? (
                              <SkinImage
                                skin={exclusiveCondition.skin}
                                size={40}
                                alt={exclusiveCondition.name}
                              />
                            ) : null}
                            <Box>
                              <Typography variant="body2">{exclusiveCondition.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {exclusiveKey}
                              </Typography>
                            </Box>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  )}
                  {killBuff && extra.kill_buff && (
                    <Box>
                      <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                        On kill
                      </Typography>
                      <Stack direction="row" spacing={1.25} alignItems="flex-start">
                        {killBuff.skin ? (
                          <SkinImage skin={killBuff.skin} size={40} alt={killBuff.name} />
                        ) : null}
                        <Box>
                          <Typography variant="body2">{killBuff.name}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {extra.kill_buff}
                          </Typography>
                          {killBuff.explanation && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ mt: 0.5, lineHeight: 1.4 }}
                            >
                              {killBuff.explanation}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  {essenceItems.length > 0 && (
                    <Box>
                      <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                        Essences
                      </Typography>
                      <Stack spacing={1}>
                        {essenceItems.map((row) => (
                          <ItemLinkRow
                            key={`${row.role}-${row.itemKey}`}
                            itemKey={row.itemKey}
                            name={G.items[row.itemKey as ItemKey]?.name ?? row.itemKey}
                            caption={row.role === "positive" ? "Boosts" : "Weakens"}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {inventoryItems.length > 0 && (
                    <Box>
                      <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
                        Inventory
                      </Typography>
                      <Stack spacing={1}>
                        {inventoryItems.map((itemKey) => (
                          <ItemLinkRow
                            key={itemKey}
                            itemKey={itemKey}
                            name={G.items[itemKey]?.name ?? itemKey}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {mpReturn.length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
            MP returned from HP lost
          </Typography>
          <Table size="small" sx={{ maxWidth: 280 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 0 }}>Level</TableCell>
                <TableCell align="right" sx={{ pr: 0 }}>
                  Return
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mpReturn.map((row) => (
                <TableRow key={row.level}>
                  <TableCell sx={{ pl: 0 }}>{row.level}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ pr: 0, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                  >
                    {formatMpReturnRatio(row.ratio)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {levelRows.length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
            By level
          </Typography>
          <Table size="small" sx={{ maxWidth: 280 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 0 }}>Level</TableCell>
                <TableCell align="right" sx={{ pr: 0 }}>
                  {skill.heal ? "Heal" : "Value"}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {levelRows.map((row) => (
                <TableRow key={row.level}>
                  <TableCell sx={{ pl: 0 }}>{row.level}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ pr: 0, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                  >
                    {formatSkillLevelValue(row.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <SkillAuraPanel skill={skill} G={G} />
    </Box>
  );
}
