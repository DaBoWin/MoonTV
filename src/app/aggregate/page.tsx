/* eslint-disable react-hooks/exhaustive-deps, no-console */

'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import type { VideoDetail } from '@/lib/types';

import PageLayout from '@/components/PageLayout';

interface SearchResult {
  id: string;
  title: string;
  poster: string;
  episodes?: number;
  source: string;
  source_name: string;
}

function AggregatePageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() || '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<VideoDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setError('缺少搜索关键词');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          throw new Error('搜索失败');
        }
        const data = await res.json();
        const all: SearchResult[] = data.results || [];
        const exact = all.filter((r) => r.title === query);
        setResults(exact);
      } catch (e) {
        setError(e instanceof Error ? e.message : '搜索失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [query]);

  useEffect(() => {
    if (results.length === 0) return;

    const fetchDetails = async () => {
      setDetailLoading(true);
      try {
        const promises = results.map(async (r) => {
          try {
            const res = await fetch(
              `/api/detail?source=${r.source}&id=${r.id}`
            );
            if (!res.ok) throw new Error('');
            const data: VideoDetail = await res.json();
            return data;
          } catch {
            return null;
          }
        });
        const dts = (await Promise.all(promises)).filter(
          (d): d is VideoDetail => d !== null
        );
        setDetails(dts);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetails();
  }, [results]);

  // 选出信息最完整的字段
  const chooseString = (vals: (string | undefined)[]): string | undefined => {
    return vals.reduce<string | undefined>((best, v) => {
      if (!v) return best;
      if (!best) return v;
      return v.length > best.length ? v : best;
    }, undefined);
  };

  const aggregatedInfo = {
    title: query,
    cover: chooseString(details.map((d) => d.videoInfo.cover)),
    desc: chooseString(details.map((d) => d.videoInfo.desc)),
    type: chooseString(details.map((d) => d.videoInfo.type)),
    year: chooseString(details.map((d) => d.videoInfo.year)),
    remarks: chooseString(details.map((d) => d.videoInfo.remarks)),
  };

  const infoReady = Boolean(
    aggregatedInfo.cover ||
      aggregatedInfo.desc ||
      aggregatedInfo.type ||
      aggregatedInfo.year ||
      aggregatedInfo.remarks
  );

  const uniqueSources = Array.from(
    new Map(results.map((r) => [r.source, r])).values()
  );

  // 详情映射，便于快速获取每个源的集数
  const sourceDetailMap = new Map(details.map((d) => [d.videoInfo.source, d]));

  return (
    <PageLayout activePath='/aggregate'>
      <div className='px-2 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {loading ? (
          <div className='flex items-center justify-center min-h-[60vh]'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
          </div>
        ) : error ? (
          <div className='flex items-center justify-center min-h-[60vh]'>
            <div className='text-red-500 text-center'>
              <div className='text-lg font-semibold mb-2'>加载失败</div>
              <div className='text-sm'>{error}</div>
            </div>
          </div>
        ) : !infoReady && detailLoading ? (
          <div className='flex items-center justify-center min-h-[60vh]'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
          </div>
        ) : !infoReady ? (
          <div className='flex items-center justify-center min-h-[60vh]'>
            <div className='text-gray-500 text-center'>
              <div className='text-lg font-semibold mb-2'>未找到匹配结果</div>
            </div>
          </div>
        ) : (
          <div className='max-w-[95%] mx-auto'>
            {/* 主信息区：左图右文 */}
            <div className='relative flex flex-col md:flex-row gap-8 mb-0 sm:mb-8 bg-transparent rounded-xl p-2 sm:p-6 md:items-start'>
              {/* 返回按钮 */}
              <button
                onClick={() => {
                  window.history.back();
                }}
                className='absolute top-0 left-0 -translate-x-[40%] -translate-y-[30%] sm:-translate-x-[180%] sm:-translate-y-1/2 p-2 rounded transition-colors'
              >
                <svg
                  className='h-5 w-5 text-gray-500 hover:text-green-600 transition-colors'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M15 19l-7-7 7-7'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
              {/* 封面 */}
              <div className='flex-shrink-0 w-full max-w-[200px] sm:max-w-none md:w-72 mx-auto'>
                <Image
                  src={aggregatedInfo.cover || '/images/placeholder.png'}
                  alt={aggregatedInfo.title}
                  width={288}
                  height={432}
                  className='w-full rounded-xl object-cover'
                  style={{ aspectRatio: '2/3' }}
                  priority
                />
              </div>
              {/* 右侧信息 */}
              <div
                className='flex-1 flex flex-col min-h-0'
                style={{ height: '430px' }}
              >
                <h1 className='text-3xl font-bold mb-2 tracking-wide flex items-center flex-shrink-0 text-center md:text-left w-full'>
                  {aggregatedInfo.title}
                </h1>
                <div className='flex flex-wrap items-center gap-3 text-base mb-4 opacity-80 flex-shrink-0'>
                  {aggregatedInfo.remarks && (
                    <span className='text-green-600 font-semibold'>
                      {aggregatedInfo.remarks}
                    </span>
                  )}
                  {aggregatedInfo.year && <span>{aggregatedInfo.year}</span>}
                  {aggregatedInfo.type && <span>{aggregatedInfo.type}</span>}
                </div>
                <div
                  className='mt-0 text-base leading-relaxed opacity-90 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-hide'
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {aggregatedInfo.desc}
                </div>
              </div>
            </div>
            {/* 选播放源 */}
            {uniqueSources.length > 0 && (
              <div className='mt-0 sm:mt-8 bg-transparent rounded-xl p-2 sm:p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='text-xl font-semibold'>选择播放源</div>
                  <div className='text-gray-400 ml-2'>
                    共 {uniqueSources.length} 个
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,_minmax(6rem,_1fr))] sm:gap-4 justify-start'>
                  {uniqueSources.map((src) => {
                    const d = sourceDetailMap.get(src.source);
                    const epCount = d ? d.episodes.length : src.episodes;
                    return (
                      <a
                        key={src.source}
                        href={`/play?source=${src.source}&id=${
                          src.id
                        }&title=${encodeURIComponent(
                          src.title
                        )}&from=aggregate`}
                        className='relative flex items-center justify-center w-full h-14 bg-gray-500/80 hover:bg-green-500 rounded-lg transition-colors'
                      >
                        {/* 名称 */}
                        <span className='px-1 text-white text-sm font-medium truncate whitespace-nowrap'>
                          {src.source_name}
                        </span>
                        {/* 集数徽标 */}
                        {epCount && epCount > 1 ? (
                          <span className='absolute top-[2px] right-1 text-[10px] font-semibold text-green-900 bg-green-300/90 rounded-full px-1 pointer-events-none'>
                            {epCount}集
                          </span>
                        ) : null}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default function AggregatePage() {
  return (
    <Suspense>
      <AggregatePageClient />
    </Suspense>
  );
}
