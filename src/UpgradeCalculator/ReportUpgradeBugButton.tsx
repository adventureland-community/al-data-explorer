import BugReportIcon from "@mui/icons-material/BugReport";
import { Button, Tooltip } from "@mui/material";
import { useState } from "react";

import type {
  MaterialLine,
  PlanSummaryStep,
  PriceTable,
  UpgradeStepOverride,
} from "../calculators";
import type { UpgradeCalcParams } from "./useUpgradeCalcParams";
import {
  buildUpgradeBugReportSnapshot,
  buildUpgradeIssueUrl,
  formatUpgradeBugReportMarkdown,
  UPGRADE_ISSUES_URL,
} from "./upgradeBugReport";

export function ReportUpgradeBugButton({
  params,
  priceOverrides,
  prices,
  stepOverrides,
  itemKey,
  itemName,
  itemValue,
  planEv,
  materials,
  steps,
}: {
  params: UpgradeCalcParams;
  priceOverrides: PriceTable;
  prices: PriceTable;
  stepOverrides: Record<string, UpgradeStepOverride>;
  itemKey: string | null;
  itemName?: string | null;
  itemValue: number;
  planEv: number | null;
  materials: MaterialLine[] | null;
  steps: PlanSummaryStep[] | null;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "opened">("idle");

  const onClick = () => {
    const snapshot = buildUpgradeBugReportSnapshot({
      url: window.location.href,
      params,
      priceOverrides,
      prices,
      stepOverrides,
      itemKey,
      itemName,
      itemValue,
      planEv,
      materials,
      steps,
    });
    const markdown = formatUpgradeBugReportMarkdown(snapshot);
    const issueUrl = buildUpgradeIssueUrl({ markdownBody: markdown });

    const finish = (next: "copied" | "opened") => {
      setStatus(next);
      window.setTimeout(() => setStatus("idle"), 2000);
    };

    navigator.clipboard.writeText(markdown).then(
      () => {
        if (issueUrl) {
          window.open(issueUrl, "_blank", "noopener,noreferrer");
          finish("opened");
        } else {
          window.open(UPGRADE_ISSUES_URL, "_blank", "noopener,noreferrer");
          finish("copied");
        }
      },
      () => {
        window.open(issueUrl ?? UPGRADE_ISSUES_URL, "_blank", "noopener,noreferrer");
        finish("opened");
      },
    );
  };

  const label =
    status === "opened"
      ? "Issue opened"
      : status === "copied"
      ? "Copied; paste into issue"
      : "Report bug";

  return (
    <Tooltip title="Copies settings, prices, step edits, and shopping list; opens a GitHub issue">
      <Button
        size="small"
        variant="outlined"
        color="warning"
        startIcon={<BugReportIcon fontSize="small" />}
        onClick={onClick}
      >
        {label}
      </Button>
    </Tooltip>
  );
}
