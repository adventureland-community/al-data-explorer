import axios, { AxiosResponse } from "axios";

const GET_OWNERS_URL = "https://aldata.earthiverse.ca/active-owners";

export type OwnerResponseProps = {
  owner: string;
  characters: string[];
};

export const getOwners = async (): Promise<OwnerResponseProps[]> => {
  console.log("Retrieving owner data from earth's api");
  try {
    let data: OwnerResponseProps[] = [];
    const axiosResponse: AxiosResponse = await axios.get(GET_OWNERS_URL);
    console.log(axiosResponse);
    data = axiosResponse.data as OwnerResponseProps[];
    return data;
  } catch (err) {
    return [];
  }
};
