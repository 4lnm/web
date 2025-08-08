import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';
import Navbarcomponent from '@/components/navbar/Navbar';
import { AnimeInfoAnilist } from '@/lib/Anilistfunctions';
import { redis } from '@/lib/rediscache';
import DetailsContainer from './DetailsContainer';

let infoCache = null;

async function getInfo(id) {
  if (infoCache) return infoCache;

  try {
    let cachedData;

    if (redis) {
      cachedData = await redis.get(`info:${id}`);
      if (cachedData && !JSON.parse(cachedData)) {
        await redis.del(`info:${id}`);
        cachedData = null;
      }
    }

    if (cachedData) {
      infoCache = JSON.parse(cachedData);
    } else {
      const data = await AnimeInfoAnilist(id);
      const cacheTime = data?.nextAiringEpisode?.episode
        ? 60 * 60 * 2
        : 60 * 60 * 24 * 45;

      if (redis && data) {
        await redis.set(`info:${id}`, JSON.stringify(data), "EX", cacheTime);
      }

      infoCache = data;
    }

    return infoCache;
  } catch (error) {
    console.error("Error fetching info:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const id = params.infoid?.[0];
  const data = await getInfo(id);

  if (!data) {
    return {
      title: 'Anime Not Found',
      description: 'No information available.',
      openGraph: {
        title: 'Anime Not Found',
        images: ['https://example.com/default-image.jpg'],
        description: 'The requested anime could not be found.',
      },
      twitter: {
        card: 'summary',
        title: 'Anime Not Found',
        description: 'No info could be loaded.',
      },
    };
  }

  return {
    title: data?.title?.english || data?.title?.romaji || 'Unknown Title',
    description: data?.description?.slice(0, 180) || 'No description available.',
    openGraph: {
      title: data?.title?.english || data?.title?.romaji || 'Unknown Title',
      images: [data?.coverImage?.extraLarge || 'https://example.com/default-image.jpg'],
      description: data?.description || 'No description available.',
    },
    twitter: {
      card: 'summary',
      title: data?.title?.english || data?.title?.romaji || 'Unknown Title',
      description: data?.description?.slice(0, 180) || 'No description available.',
    },
  };
}

async function AnimeDetails({ params }) {
  const session = await getAuthSession();
  const id = params.infoid?.[0];
  const data = await getInfo(id);

  if (!data) {
    return (
      <div className="p-6 text-center">
        <Navbarcomponent />
        <h1 className="text-2xl font-bold">Anime Not Found</h1>
        <p className="mt-2 text-gray-500">We couldn’t load the requested anime info.</p>
      </div>
    );
  }

  return (
    <div>
      <Navbarcomponent />
      <DetailsContainer data={data} id={id} session={session} />
    </div>
  );
}

export default AnimeDetails;
