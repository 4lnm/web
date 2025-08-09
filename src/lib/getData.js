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

export const getSources = async (anilistId, episodeNumber) => {
  console.log("[getSources] Starting source fetch...");

  // 🛑 Step 0: Input validation
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
    // 1️⃣ Map AniList ID to AnimePahe
    console.log("[getSources] Step 1: Mapping AniList ID to AnimePahe...");
    const mapRes = await fetch(`https://anime-mapper-eight.vercel.app/animepahe/map/${anilistId}`);
    console.log(`[getSources] Mapping request status: ${mapRes.status}`);

    if (!mapRes.ok) throw new Error("❌ Failed to map AniList ID to AnimePahe");

    const animeData = await mapRes.json();
    console.log("[getSources] Mapping response:", animeData);

    if (!animeData?.data?.episodes || animeData.data.episodes.length === 0) {
      throw new Error("❌ No episodes found in mapped data");
    }

    // 2️⃣ Check if requested episode exists
    console.log(`[getSources] Step 2: Checking if episode ${episodeNumber} exists...`);
    const episodeExists = animeData.data.episodes.some(
      ep => parseInt(ep.number) === parseInt(episodeNumber)
    );

    if (!episodeExists) {
      console.warn(`[getSources] ⚠ Episode ${episodeNumber} not found for AniList ID ${anilistId}`);
      throw new Error(`❌ Episode ${episodeNumber} not found`);
    }
    console.log("[getSources] ✅ Episode exists!");

    // 3️⃣ Fetch HLS sources
    console.log("[getSources] Step 3: Fetching HLS sources...");
    const sourcesUrl = `https://anime-mapper-eight.vercel.app/animepahe/hls/${anilistId}/${episodeNumber}`;
    console.log(`[getSources] Fetching from: ${sourcesUrl}`);

    const sourcesRes = await fetch(sourcesUrl);
    console.log(`[getSources] Sources request status: ${sourcesRes.status}`);

    if (!sourcesRes.ok) throw new Error("❌ Failed to fetch streaming sources");

    const sourcesData = await sourcesRes.json();
    console.log("[getSources] ✅ Sources fetched successfully:", sourcesData);

    return sourcesData;

  } catch (err) {
    console.error("💥 Error in getSources:", err);
    return null;
  }
};

