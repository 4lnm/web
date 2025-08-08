  import { getAuthSession } from '@/app/api/auth/[...nextauth]/route'
import Navbarcomponent from '@/components/navbar/Navbar'
import { AnimeInfoAnilist } from '@/lib/Anilistfunctions'
import { redis } from '@/lib/rediscache'
import DetailsContainer from './DetailsContainer'

import { apiRateLimiter } from '@/lib/ratelimiter'; // ✅ Add this line


  if (!apiRateLimiter || !apiRateLimiter.enqueue) {
  throw new Error("apiRateLimiter is not initialized or enqueue is missing");
}


  // At the top
  let infoCache = null;

  // Modified getInfo
  async function getInfo(id) {
    if (infoCache) return infoCache;
    try {
      let cachedData;
      if (redis) {
        cachedData = await redis.get(`info:${id}`);
        if (!JSON.parse(cachedData)) {
          await redis.del(`info:${id}`);
          cachedData = null;
        }
      }
      if (cachedData) {
        infoCache = JSON.parse(cachedData);
      } else {
        const data = await apiRateLimiter.enqueue(() => AnimeInfoAnilist(id));
        const cacheTime = data?.nextAiringEpisode?.episode ? 60 * 60 * 2 : 60 * 60 * 24 * 45;
        if (redis && data) {
          await redis.set(`info:${id}`, JSON.stringify(data), "EX", cacheTime);
        }
        infoCache = data;
      }
      return infoCache;
    } catch (error) {
      console.error("Error fetching info: ", error);
    }
  }


  export async function generateMetadata({ params }) {
    const id = params.infoid[0];
    const data = await getInfo(id);
    // const data = await AnimeInfoAnilist(id);

    return {
      title: data?.title?.english || data?.title?.romaji || 'Loading...',
      description: data?.description.slice(0, 180),
      openGraph: {
        title: data?.title?.english || data?.title?.romaji,
        images: [data?.coverImage?.extraLarge],
        description: data?.description,
      },
      twitter: {
        card: "summary",
        title: data?.title?.english || data?.title?.romaji,
        description: data?.description?.slice(0, 180),
      },
    }
  }

  async function AnimeDetails({ params }) {
    const session = await getAuthSession();
    const id = params.infoid[0];
    // const data = await getInfo(id);
    const data = await getInfo(id);

    return (
      <div className="">
        <Navbarcomponent />
        <DetailsContainer data={data} id={id} session={session}/>
      </div>
    )
  }

  export default AnimeDetails