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
    const episodeId = encodeURIComponent(epid);
    const category = subdub.toLowerCase(); // "sub" or "dub"
    const server = "hd-1"; // you can change this if needed

    const url = `${checkEnvironment()}/api/v2/hianime/episode/sources?animeEpisodeId=${episodeId}&ep=${epnum}&server=${server}&category=${category}`;

    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Zoro episode sources");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Zoro episode sources:", error);
    return null;
  }
};
