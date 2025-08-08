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

export const getSources = async (anilistId, episodeNumber, subOrDub = "sub", server = "hd-1") => {
  try {
    // 1️⃣ Map AniList ID to HiAnime data (this includes episode list)
    const mapRes = await fetch(`https://anime-mapper-eight.vercel.app/hianime/${anilistId}`);
    if (!mapRes.ok) throw new Error("Failed to map AniList ID to HiAnime");
    const animeData = await mapRes.json();

    // 2️⃣ Find the requested episode
    const episode = animeData?.hianime?.episodes?.find(ep => 
      parseInt(ep.number) === parseInt(episodeNumber)
    );
    if (!episode) throw new Error(`Episode ${episodeNumber} not found for AniList ID ${anilistId}`);

    // 3️⃣ Fetch the sources from mapper’s HiAnime sources endpoint
    const srcUrl = `https://anime-mapper-eight.vercel.app/hianime/sources/${episode.id}?ep=${encodeURIComponent(episode.number)}&server=${encodeURIComponent(server)}&category=${encodeURIComponent(subOrDub)}`;
    const sourcesRes = await fetch(srcUrl);
    if (!sourcesRes.ok) throw new Error("Failed to fetch streaming sources");

    // 4️⃣ Return the response (includes sources + required headers)
    return await sourcesRes.json();

  } catch (err) {
    console.error("Error in getSources:", err);
    return null;
  }
};