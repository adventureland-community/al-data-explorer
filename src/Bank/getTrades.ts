import axios, { AxiosResponse } from "axios";
import { ALDATA_BASE_URL } from "../aldataBaseUrl";
import { OwnerTrades, OwnerTradesResponse, TradeListing } from "../Trades/tradeTypes";

const GET_TRADES_ROOT = `${ALDATA_BASE_URL}/trades`;

export const getOwnerTrades = async (ownerId: string): Promise<OwnerTradesResponse> => {
  if (ownerId === "") {
    return { listings: [] };
  }

  console.log("Retrieving owner trades from earth's api for owner: ", ownerId);
  try {
    const axiosResponse: AxiosResponse = await axios.get(`${GET_TRADES_ROOT}/${ownerId}`);
    console.log(axiosResponse);
    const data = axiosResponse.data as OwnerTradesResponse;
    return {
      listings: data.listings ?? [],
      lastUpdated: data.lastUpdated,
      characters: data.characters,
      label: data.label,
      displayName: data.displayName,
      discordName: data.discordName,
      discordId: data.discordId,
    };
  } catch (err) {
    return { listings: [] };
  }
};

export const getAllTrades = async (): Promise<OwnerTrades[]> => {
  console.log("Retrieving all trades from earth's api");
  try {
    const axiosResponse: AxiosResponse = await axios.get(GET_TRADES_ROOT);
    console.log(axiosResponse);
    const data = axiosResponse.data as OwnerTrades[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};

/** Listing matches a bank item when name equal and unset listing level/p are wildcards. */
export function listingMatchesItem(
  listing: TradeListing,
  item: { name: string; level?: number; p?: string },
): boolean {
  if (listing.name !== item.name) {
    return false;
  }
  if (listing.level !== undefined && listing.level !== item.level) {
    return false;
  }
  if (listing.p !== undefined && listing.p !== item.p) {
    return false;
  }
  return true;
}

export function findMatchingListings(
  listings: TradeListing[],
  item: { name: string; level?: number; p?: string },
): TradeListing[] {
  return listings.filter((listing) => listingMatchesItem(listing, item));
}
