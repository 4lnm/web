import { redis } from '@/lib/rediscache';
import { CombineEpisodeMeta } from '@/utils/EpisodeFunctions';
import axios from 'axios';
import { NextResponse } from "next/server";

axios.interceptors.request.use(config => {
  config.timeout = 9000;
  return config;
});

async function fetchConsumet(id) {
  console.log(`[fetchConsumet] Start fetching episodes for id: ${id}`);
  try {
    async function fetchData(dub) {
      console.log(`[fetchConsumet] fetching ${dub ? 'dub' : 'sub'} data`);
      const { data } = await axios.get(
        `${process.env.CONSUMET_URI}/meta/anilist/episodes/${id}${dub ? "?dub=true" : ""}`
      );
      if (data?.message === "Anime not found" && data?.length < 1) {
        console.log('[fetchConsumet] Anime not found or empty data');
        return [];
      }
      console.log(`[fetchConsumet] Received ${dub ? 'dub' : 'sub'} data:`, data);
      return data;
    }
    const [subData, dubData] = await Promise.all([
      fetchData(),
      fetchData(true),
    ]);

    const array = [
      {
        consumet: true,
        providerId: "gogoanime",
        episodes: {
          ...(subData && subData.length > 0 && { sub: subData }),
          ...(dubData && dubData.length > 0 && { dub: dubData }),
        },
      },
    ];

    console.log('[fetchConsumet] Returning combined episodes:', array);
    return array;
  } catch (error) {
    console.error("[fetchConsumet] Error fetching consumet:", error.message);
    return [];
  }
}

async function fetchAnify(id) {
  console.log(`[fetchAnify] Start fetching anify episodes for id: ${id}`);
  try {
    const { data } = await axios.get(`https://anify.eltik.cc/info/${id}?fields=[episodes]`);

    if (!data || !data?.episodes?.data) {
      console.log('[fetchAnify] No episodes data found');
      return [];
    }
    const epdata = data?.episodes?.data;

    const filtereddata = epdata?.filter((episodes) => episodes.providerId !== "9anime");
    const mappedData = filtereddata?.map((i) => {
      if (i?.providerId === "gogoanime"){
        return {
          episodes: i.episodes,
          providerId: "gogobackup",
        };
      }
      return i;
    });
    console.log('[fetchAnify] Returning mapped data:', mappedData);
    return mappedData;
  } catch (error) {
    console.error("[fetchAnify] Error fetching anify:", error.message);
    return [];
  }
}

import { apiRateLimiter } from '@/lib/rateLimiter';

async function MalSync(id) {
  console.log(`[MalSync] Start fetching Malsync data for id: ${id}`);
  try {
    const response = await apiRateLimiter.enqueue(() => axios.get(`${process.env.MALSYNC_URI}${id}`));
    
    const data = response?.data;
    console.log('[MalSync] Raw data:', data);

    const sites = Object.keys(data.Sites).map(providerId => ({
      providerId: providerId.toLowerCase(),
      data: Object.values(data.Sites[providerId])
    }));
    console.log('[MalSync] Parsed sites:', sites);

    const newdata = sites.filter(site => site.providerId === 'gogoanime' || site.providerId === 'zoro');
    console.log('[MalSync] Filtered sites (gogoanime or zoro):', newdata);

    const finaldata = [];
    
    newdata.forEach(item => {
      const { providerId, data } = item;
      if (providerId === 'gogoanime') {
        const dub = data.find(item => item.title.toLowerCase().endsWith(" (dub)"));
        const duburl = dub?.url?.split('/').pop();
        const sub = data.find(item => item.title.toLowerCase().includes(" (uncensored)"))?.url?.split('/').pop() 
                  ?? data.find(item => item?.url === dub?.url?.replace(/-dub$/, ''))?.url?.split('/').pop() 
                  ?? data.find(item => !item.title.toLowerCase().includes(")"))?.url?.split('/').pop();
        finaldata.push({ providerId, sub: sub || "", dub: duburl || "" });
      } else {
        const sub = data[0]?.url?.split('/').pop();
        finaldata.push({ providerId, sub: sub || '' });
      }
    });

    console.log('[MalSync] Final processed data:', finaldata);
    return finaldata;
  } catch (error) {
    console.error('[MalSync] Error fetching data from Malsync:', error);
    return null;
  }
}

async function fetchGogoanime(sub, dub) {
  console.log(`[fetchGogoanime] Start fetching gogoanime data with sub: "${sub}" dub: "${dub}"`);
  try {
    async function fetchData(id) {
      console.log(`[fetchGogoanime] fetching info for id: ${id}`);
      const { data } = await axios.get(
        `${process.env.CONSUMET_URI}/anime/gogoanime/info/${id}`
      );
      if (data?.message === "Anime not found" && data?.episodes?.length < 1) {
        console.log('[fetchGogoanime] Anime not found or no episodes');
        return [];
      }
      console.log(`[fetchGogoanime] Episodes received:`, data?.episodes);
      return data?.episodes;
    }

    const [subData, dubData] = await Promise.all([
      sub !== "" ? fetchData(sub) : Promise.resolve([]),
      dub !== "" ? fetchData(dub) : Promise.resolve([]),
    ]);

    const array = [
      {
        consumet: true,
        providerId: "gogoanime",
        episodes: {
          ...(subData && subData.length > 0 && { sub: subData }),
          ...(dubData && dubData.length > 0 && { dub: dubData }),
        },
      },
    ];

    console.log('[fetchGogoanime] Returning combined episodes:', array);
    return array;
  } catch (error) {
    console.error("[fetchGogoanime] Error fetching consumet gogoanime:", error.message);
    return [];
  }
}

async function fetchZoro(id) {
  console.log(`[fetchZoro] Start fetching zoro episodes for id: ${id}`);
  try {
    const { data } = await axios.get(`${process.env.ZORO_URI}/anime/episodes/${id}`);
    if (!data?.episodes) {
      console.log('[fetchZoro] No episodes found');
      return [];
    }
    const array = [
      {
        providerId: "zoro",
        episodes: data?.episodes,
      },
    ];
    console.log('[fetchZoro] Returning episodes:', array);
    return array;
  } catch (error) {
    console.error("[fetchZoro] Error fetching zoro:", error.message);
    return [];
  }
}

async function fetchEpisodeMeta(id, available = false) {
  console.log(`[fetchEpisodeMeta] Start fetching episode meta for id: ${id}, available: ${available}`);
  try {
    if (available) {
      console.log('[fetchEpisodeMeta] Available flag is true, returning null');
      return null;
    }
    
    const data = await axios.get(`https://api.ani.zip/mappings?anilist_id=${id}`);
    const episodesArray = Object.values(data?.data?.episodes);

    if (!episodesArray) {
      console.log('[fetchEpisodeMeta] No episodes array found');
      return [];
    }
    console.log('[fetchEpisodeMeta] Episodes meta fetched:', episodesArray);
    return episodesArray;
  } catch (error) {
    console.error("[fetchEpisodeMeta] Error fetching and processing meta:", error.message);
    return [];
  }
}

const fetchAndCacheData = async (id, meta, redis, cacheTime, refresh) => {
  console.log(`[fetchAndCacheData] Start for id: ${id} with refresh: ${refresh}`);
  let malsync;
  if (id) {
    malsync = await MalSync(id);
    console.log('[fetchAndCacheData] Malsync data:', malsync);
  }

  const promises = [];

  if (malsync) {
    const gogop = malsync.find((i) => i.providerId === 'gogoanime');
    const zorop = malsync.find((i) => i.providerId === 'zoro');
  
    if (gogop) {
      console.log('[fetchAndCacheData] Fetching gogoanime episodes...');
      promises.push(fetchGogoanime(gogop.sub, gogop.dub));
    } else {
      console.log('[fetchAndCacheData] No gogoanime data found');
      promises.push(Promise.resolve([]));
    }
  
    if (zorop) {
      console.log('[fetchAndCacheData] Fetching zoro episodes...');
      promises.push(fetchZoro(zorop.sub));
    } else {
      console.log('[fetchAndCacheData] No zoro data found');
      promises.push(Promise.resolve([]));
    }
    promises.push(fetchEpisodeMeta(id, !refresh));

  } else {
    console.log('[fetchAndCacheData] No malsync data, fetching consumet and anify...');
    promises.push(fetchConsumet(id));
    promises.push(fetchAnify(id));
    promises.push(fetchEpisodeMeta(id, !refresh));
  }

  const [consumet, anify, cover] = await Promise.all(promises);  
  console.log('[fetchAndCacheData] Fetched consumet:', consumet);
  console.log('[fetchAndCacheData] Fetched anify:', anify);
  console.log('[fetchAndCacheData] Fetched cover/meta:', cover);

  if (redis) {
    if (consumet.length > 0 || anify.length > 0) {
      console.log(`[fetchAndCacheData] Caching episode data in Redis for key episode:${id} for ${cacheTime}s`);
      await redis.setex(`episode:${id}`, cacheTime, JSON.stringify([...consumet, ...anify]));
    } else {
      console.log('[fetchAndCacheData] No episode data to cache');
    }

    const combinedData = [...consumet, ...anify];
    let data = combinedData;

    if (refresh) {
      console.log('[fetchAndCacheData] Refresh is true, combining with cover/meta');
      if (cover && cover?.length > 0) {
        try {
          await redis.setex(`meta:${id}`, cacheTime, JSON.stringify(cover));
          data = await CombineEpisodeMeta(combinedData, cover);
        } catch (error) {
          console.error("[fetchAndCacheData] Error serializing cover:", error.message);
        }
      } else if (meta) {
        console.log('[fetchAndCacheData] Using existing meta to combine');
        data = await CombineEpisodeMeta(combinedData, JSON.parse(meta));
      }
    } else if (meta) {
      console.log('[fetchAndCacheData] Refresh is false, combining with existing meta');
      data = await CombineEpisodeMeta(combinedData, JSON.parse(meta));
    }

    console.log('[fetchAndCacheData] Returning final combined data');
    return data;
  } else {
    console.error("[fetchAndCacheData] Redis URL not provided. Caching not possible.");
    return [...consumet, ...anify];
  }
};

export const GET = async (req, { params }) => {
  console.log('[GET] Request received');
  const url = new URL(req.url);
  const id = params.animeid[0];
  const releasing = url.searchParams.get('releasing') || false;
  const refresh = url.searchParams.get('refresh') === 'true' || false;

  console.log(`[GET] Params - id: ${id}, releasing: ${releasing}, refresh: ${refresh}`);

  let cacheTime = null;
  if (releasing === "true") {
    cacheTime = 60 * 60 * 3; // 3 hours
  } else if (releasing === "false") {
    cacheTime = 60 * 60 * 24 * 45; // 45 days
  }
  console.log(`[GET] Cache time set to ${cacheTime} seconds`);

  let meta = null;
  let cached;

  if (redis) {
    try {
      console.log('[GET] Checking Redis cache...');
      meta = await redis.get(`meta:${id}`);
      console.log('[GET] Meta cache:', meta ? "Found" : "Not found");

      if (meta && JSON.parse(meta)?.length === 0) {
        await redis.del(`meta:${id}`);
        console.log("[GET] Deleted empty meta cache");
        meta = null;
      }

      cached = await redis.get(`episode:${id}`);
      console.log('[GET] Episode cache:', cached ? "Found" : "Not found");

      if (cached && JSON.parse(cached)?.length === 0) {
        await redis.del(`episode:${id}`);
        console.log("[GET] Deleted empty episode cache");
        cached = null;
      }

      let data;
      if (refresh) {
        console.log('[GET] Refresh requested, fetching fresh data');
        data = await fetchAndCacheData(id, meta, redis, cacheTime, refresh);
      }

      if (data?.length > 0) {
        console.log('[GET] Returning fresh data after refresh');
        return NextResponse.json(data);
      }

      console.log('[GET] Using Redis cached data if available');
    } catch (error) {
      console.error("[GET] Error checking Redis cache:", error.message);
    }
  }

  if (cached) {
    try {
      console.log('[GET] Parsing cached data');
      let cachedData = JSON.parse(cached);
      if (meta) {
        console.log('[GET] Combining cached data with meta');
        cachedData = await CombineEpisodeMeta(cachedData, JSON.parse(meta));
      }
      console.log('[GET] Returning cached combined data');
      return NextResponse.json(cachedData);
    } catch (error) {
      console.error("[GET] Error parsing cached data:", error.message);
    }
  }

  console.log('[GET] No cached data, fetching and caching new data');
  const fetchdata = await fetchAndCacheData(id, meta, redis, cacheTime, !refresh);
  return NextResponse.json(fetchdata);
};
