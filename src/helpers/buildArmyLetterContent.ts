import { chunk } from 'lodash';
import { RankItemWithDetail } from '../api/news';

export default function buildArmyLetterContent (rankItems: RankItemWithDetail[]) {
  const result: string[] = [];
  for (const item of rankItems) {
    let contentHeading = `# 실시간 검색어 ${item.rank}위 : ${item.keyword}`;
    if (item.keyword_synonyms.length) {
      contentHeading += ` (관련검색어 : ${item.keyword_synonyms.join(', ')})`;
    }
    if (item.detail) {
      const contentChunks = chunk(item.detail.content, 700).map(data => data.join(''));
      for (const [index, content] of Object.entries(contentChunks)) {
        result.push(`${contentHeading} : 본문 ${index}\n\n${content}`);
      }
    } else {
      result.push(`${contentHeading}\n\n관련된 뉴스 내용 없음 ###############`);
    }
  }
  return result;
}