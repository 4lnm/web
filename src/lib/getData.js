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

export const getSources = async (anilistId, episodeNumber, subOrDub = "sub") => {
  try {
    // 1. Get anime info (includes episode list)
    const infoRes = await fetch(`https://hianime-mapper-ivory-five.vercel.app/anime/info/${anilistId}`);
    if (!infoRes.ok) throw new Error("Failed to fetch anime info");
    const animeInfo = await infoRes.json();
    const data = await getSources(21, 2142, "sub");
    // 2. Find the episode object for the requested episode number
    const episodeObj = animeInfo.episodes.find(ep => 
      parseInt(ep.number) === parseInt(episodeNumber)
    );
    if (!episodeObj) throw new Error(`Episode ${episodeNumber} not found`);

    const animeEpisodeId = episodeObj.id; // HiAnime's internal episode ID
    const epNum = episodeObj.number;

    // 3. Build the aw-api URL for sources
    const baseUrl = "https://aw-api.vercel.app/api/v2/hianime/episode/sources";
    const url = `${baseUrl}?animeEpisodeId=${encodeURIComponent(animeEpisodeId)}&ep=${encodeURIComponent(epNum)}&server=hd-1&category=${encodeURIComponent(subOrDub)}`;

    // 4. Fetch the episode sources 
    const sourcesRes = await fetch(url);
  
    if (!sourcesRes.ok) throw new Error("Failed to fetch episode sources");

    return await sourcesRes.json();

  } catch (error) {
    console.error("Error in getSources:", error);
    return null;
  }
};