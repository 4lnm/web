import axios from 'axios';
import { NextResponse } from "next/server";

async function consumetEpisode(id) {
  try {
    const { data } = await axios.get(
      `${process.env.CONSUMET_URI}/meta/anilist/watch/${id}`
    );
    return data;
  } catch (error) {
    console.error("Consumet fetch failed:", error);
    return null;
  }
}

async function zoroEpisode(provider, episodeid, epnum, id, subtype) {
  try {
    const cleanEpisodeId = episodeid.replace("/watch/", "");
    const { data } = await axios.get(`${process.env.ZORO_URI}/anime/episode-srcs?id=${cleanEpisodeId}&server=vidstreaming&category=${subtype}`);
    
    // Fallback to Anify if Zoro returns no sources
    if (!data?.sources?.length) {
      console.warn("Zoro returned no sources. Falling back to Anify...");
      return await AnifyEpisode(provider, episodeid, epnum, id, subtype);
    }

    return data;
  } catch (error) {
    console.error("Zoro fetch failed:", error);
    return await AnifyEpisode(provider, episodeid, epnum, id, subtype);
  }
}

async function AnifyEpisode(provider, episodeid, epnum, id, subtype) {
  try {
    const { data } = await axios.get(
      `https://anify.eltik.cc/sources?providerId=${provider}&watchId=${encodeURIComponent(
        episodeid
      )}&episodeNumber=${epnum}&id=${id}&subType=${subtype}`
    );
    return data;
  } catch (error) {
    console.error("Anify fetch failed:", error);
    return null;
  }
}

export const POST = async (req, { params }) => {
  const id = params.epsource[0];
  const { source, provider, episodeid, episodenum, subtype } = await req.json();

  // Uncomment if you want to add Redis back
  // let cacheTime = 25 * 60;
  // let cached = await redis.get(`source:${params.epid[0]}`);
  // if (cached) {
  //     const cachedData = JSON.parse(cached);
  //     return NextResponse.json(cachedData);
  // } else {
  //     const data = await consumetEpisode(params.epid[0]);
  //     await redis.setex(`source:${params.epid[0]}`, cacheTime, JSON.stringify(data));
  //     return NextResponse.json(data);
  // }

  console.log(provider, episodeid, episodenum, id, subtype);

  // Consumet route
  if (source === "consumet") {
    const data = await consumetEpisode(episodeid);
    if (data?.sources?.length) return NextResponse.json(data);

    console.warn("Consumet returned no sources. Trying Zoro...");
    const fallbackZoro = await zoroEpisode("zoro", episodeid, episodenum, id, subtype);
    if (fallbackZoro?.sources?.length) return NextResponse.json(fallbackZoro);

    const fallbackAnify = await AnifyEpisode("zoro", episodeid, episodenum, id, subtype);
    if (fallbackAnify?.sources?.length) return NextResponse.json(fallbackAnify);

    return NextResponse.json({ error: "No episode sources found from any provider." }, { status: 404 });
  }

  // Anify with Zoro provider
  if (source === "anify" && provider === "zoro") {
    const data = await zoroEpisode(provider, episodeid, episodenum, id, subtype);
    return NextResponse.json(data);
  }

  // Anify generic
  if (source === "anify") {
    const data = await AnifyEpisode(provider, episodeid, episodenum, id, subtype);
    return NextResponse.json(data);
  }

  // Final fallback
  return NextResponse.json({ error: "Unsupported source or provider." }, { status: 400 });
};
