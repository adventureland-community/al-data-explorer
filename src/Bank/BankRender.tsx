import { useState, useEffect } from "react";

import { getBankData, BankDataProps } from "./getBankData";

type BankRenderProps = {
  ownerId: string;
};

export function BankRender(props: BankRenderProps) {
  const { ownerId } = props;

  const [bankData, setBankData] = useState<BankDataProps>({});
  const [owner, setOwner] = useState<string>("");

  useEffect(() => {
    if (!Object.keys(bankData).length) {
      getBankData(ownerId).then((newBankData) => {
        if (Object.keys(newBankData).length) {
          setBankData({ ...newBankData });
        }
      });
    }

    if (owner !== ownerId) {
      setOwner(ownerId);
      setBankData({});
    }
  }, [bankData, owner, ownerId]);

  if (!Object.keys(bankData).length) {
    return <></>;
  }

  // TODO: Parse and group bank data

  return <>TODO: render table of bank data</>;
}
