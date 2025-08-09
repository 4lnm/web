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

const proxyUrl = "https://rust-proxy-production.up.railway.app/?url=";

export const getSources = async (anilistId, episodeNumber) => {
  console.log("[getSources] Starting source fetch...");

  if (!anilistId || isNaN(Number(anilistId))) {
    console.error("❌ Invalid anilistId provided:", anilistId);
    return null;
  }
  if (!episodeNumber || isNaN(Number(episodeNumber))) {
    console.error("❌ Invalid episodeNumber provided:", episodeNumber);
    return null;
  }
  console.log(`[getSources] ✅ Input valid. anilistId = ${anilistId}, episodeNumber = ${episodeNumber}`);

  try {
    // Step 1: Get mapping data via proxy
    const mapUrl = `https://anime-mapper-eight.vercel.app/animepahe/map/${anilistId}`;
    console.log("[getSources] Step 1: Fetch mapping data via proxy...");
    const mapRes = await fetch(proxyUrl + encodeURIComponent(mapUrl));
    if (!mapRes.ok) throw new Error("Failed to fetch mapping data");
    const mapData = await mapRes.json();

    if (!mapData?.animepahe?.episodes || mapData.animepahe.episodes.length === 0) {
      throw new Error("No episodes found in mapping data");
    }

    // Step 2: Find episode object by number
    const episodeObj = mapData.animepahe.episodes.find(ep => ep.number === Number(episodeNumber));
    if (!episodeObj) {
      throw new Error(`Episode ${episodeNumber} not found`);
    }
    console.log("[getSources] Found episode object:", episodeObj);

    // Step 3: Fetch streaming sources using episodeId via proxy
    const episodeIdEncoded = encodeURIComponent(episodeObj.episodeId);
    const sourcesUrl = `https://anime-mapper-eight.vercel.app/animepahe/hls/${anilistId}/${episodeNumber}`;
    console.log(`[getSources] Fetching sources from via proxy: ${sourcesUrl}`);

    const sourcesRes = await fetch(proxyUrl + encodeURIComponent(sourcesUrl));
    if (!sourcesRes.ok) throw new Error("Failed to fetch streaming sources");
    const sourcesData = await sourcesRes.json();

    console.log("[getSources] Sources data:", sourcesData);
    return sourcesData;

  } catch (error) {
    console.error("Error in getSources:", error);
    return null;
  }
};
