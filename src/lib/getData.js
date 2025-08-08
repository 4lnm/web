import { checkEnvironment } from "./checkEnvironment";

export const getRecentEpisodes = async () => {
  try {
    const response = await fetch(
      `${checkEnvironment()}/api/recent`,{ cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch recent episodes')
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Anify Recent Episodes:", error);
  }
}

export const getEpisodes = async (id, status, refresh = false) => {
  try {
    const response = await fetch(
      `${checkEnvironment()}/api/episode/${id}?releasing=${status === "RELEASING" ? "true" : "false"}&refresh=${refresh}`,{ next: { revalidate: status === "FINISHED" ? false : 3600 } }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch episodes')
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Consumet Episodes:", error);
  }
}

export const getSources = async (id, provider, epid, epnum, subdub) => {
  try {
    const baseUrl = "https://aw-api.vercel.app/api/v2/hianime/episode/sources";

    const url = `${baseUrl}?animeEpisodeId=${encodeURIComponent(epid)}&ep=${encodeURIComponent(epnum)}&server=hd-1&category=${encodeURIComponent(subdub)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch episode sources');
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Episode sources:", error);
  }
};