"use client"
import Animecards from '@/components/CardComponent/Animecards'
import Episodesection from '@/components/Episodesection'
import AnimeDetailsBottom from '@/components/details/AnimeDetailsBottom'
import AnimeDetailsTop from '@/components/details/AnimeDetailsTop'
import { getUserLists } from '@/lib/AnilistUser'
import { useEffect, useState } from 'react'

function DetailsContainer({data, id, session}) {
    const [list,setList] = useState(null);
    const [url, setUrl] = useState(null);

    useEffect(() => {
        const fetchlist = async()=>{
            const data =await getUserLists(session?.user?.token, id);
            setList(data);
        }
        fetchlist();
    }, []);

    const progress = list!==null ? list?.status==='COMPLETED' ? 0 : list?.progress : 0

  return (
    <>
      <div className='h-[500px] '>
        <AnimeDetailsTop data={data} list={list} session={session} setList={setList} url={url}/>
      </div>
      <AnimeDetailsBottom data={data} />
      <Episodesection data={data} id={id} setUrl={setUrl} progress={progress}/> 
      
      {data?.recommendations?.nodes?.length > 0 && (
        <div className="recommendationglobal">
          <Animecards data={data.recommendations.nodes} cardid={"Recommendations"} />
        </div>
      )} 
    </>
  )
}

export default DetailsContainer
