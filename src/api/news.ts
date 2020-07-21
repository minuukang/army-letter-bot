import fetch, { Response } from 'node-fetch';
import cheerio from 'cheerio';
import iconv from 'iconv-lite';

export interface RankItem {
  rank: number;
  keyword: string;
  keyword_synonyms: string[];
}

export interface DetailContent {
  title: string;
  content: string;
}

export interface RankItemWithDetail extends RankItem {
  detail: null | DetailContent;
}

const rankUrl = 'https://apis.naver.com/mobile_main/srchrank/srchrank?frm=main&ag=all&gr=4&ma=-2&si=2&en=2&sp=-2';

const newsParser: Record<string, (response: Response) => Promise<DetailContent>> = {
  'entertain.naver.com': async response => {
    const $ = cheerio.load(await response.text());
    return {
      title: $('.end_tit').text().trim(),
      content: $('#articeBody').text().trim(),
    };
  },
  'news.naver.com': async response => {
    const buffer = await response.arrayBuffer();
    const content = iconv.decode(Buffer.from(buffer), 'EUC-KR').toString();
    const $ = cheerio.load(content);
    return {
      title: $('#articleTitle').text().trim(),
      content: $('#articleBodyContents').text().trim(),
    }
  }
};

async function getNewsDetail (link: string) {
  const response = await fetch(link);
  for (const [path, parser] of Object.entries(newsParser)) {
    if (response.url.includes(path)) {
      return parser(response);
    }
  }
  throw new Error(`response url (${response.url}) not have a newsParser`);
}

async function getNewsLink (keyword: string) {
  const response = await fetch(`https://search.naver.com/search.naver?where=news&sm=tab_jum&query=${encodeURIComponent(keyword)}`);
  const page = cheerio.load(await response.text());
  const linkOfNews = page('._sp_each_url')
    .filter((_, el) => page(el).text() === '네이버뉴스')
    .eq(0).attr('href');
  return linkOfNews;
}

export default async function getNews (): Promise<RankItemWithDetail[]> {
  const response: { data: RankItem[] } = await (await fetch(rankUrl)).json();
  return Promise.all(response.data.map(async item => {
    const link = await getNewsLink(item.keyword);
    return {
      ...item,
      detail: link ? await getNewsDetail(link) : null
    };
  }));
};

