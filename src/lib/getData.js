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
    // 1️⃣ Map AniList ID to AnimePahe data (includes episode list with episode IDs)
    const mapRes = await fetch(`https://anime-mapper-eight.vercel.app/animepahe/map/${anilistId}`);
    if (!mapRes.ok) throw new Error("Failed to map AniList ID to AnimePahe");
    const animeData = await mapRes.json();

    // 2️⃣ Find the requested episode object from mapped data (assumes episodes array with 'number' and 'id')
    const episode = animeData?.data?.episodes?.find(ep => parseInt(ep.number) === parseInt(episodeNumber));
    if (!episode) throw new Error(`Episode ${episodeNumber} not found for AniList ID ${anilistId}`);

    // 3️⃣ Fetch sources using the episode's AnimePahe episode ID and category (sub/dub/raw)
    // Using /animepahe/sources/:id with query param for subOrDub category if needed
    const sourcesUrl = `https://anime-mapper-eight.vercel.app/animepahe/sources/${episode.id}?category=${encodeURIComponent(subOrDub)}`;
    const sourcesRes = await fetch(sourcesUrl);
    if (!sourcesRes.ok) throw new Error("Failed to fetch streaming sources");

    // 4️⃣ Return sources JSON
    return await sourcesRes.json();

  } catch (err) {
    console.error("Error in getSources:", err);
    return null;
  }
};
