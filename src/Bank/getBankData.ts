import axios, { AxiosResponse } from "axios";

import { ALDATA_BASE_URL } from "../aldataBaseUrl";

const GET_BANK_DATA_ROOT = `${ALDATA_BASE_URL}/bank`;

export interface BankDataProps {
  gold?: number;
  lastUpdated?: number;
  owner?: string;
  [x: string]: any[] | number | string | undefined;
}

export const getBankData = async (ownerId: string): Promise<BankDataProps> => {
  if (ownerId === "") return {};

  console.log("Retrieving owner bank data from earth's api for owner: ", ownerId);
  try {
    let data: BankDataProps = {};
    const axiosResponse: AxiosResponse = await axios.get(`${GET_BANK_DATA_ROOT}/${ownerId}`);
    console.log(axiosResponse);
    data = axiosResponse.data as BankDataProps;
    return data;
  } catch (err) {
    return {};
  }
};
