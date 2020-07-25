import playwrite from 'playwright';
import getNews, { DetailContent } from '../api/news';
import buildArmyLetterContent from '../helpers/buildArmyLetterContent';

interface Props {
  inDate: string;
  birthDate: string;
  name: string;
  password: string;
  passAuthAgency: string;
  askModel: (question: string) => Promise<void>;
  logModel: (message: string) => void;
  headless?: boolean;
}

const pageUrl = 'http://www.katc.mil.kr/katc/community/children.jsp';

async function openArmyLetterWriteForm ({ inDate, birthDate, name, password, passAuthAgency, askModel, logModel, headless }: Props) {
  const url = new URL(pageUrl);
  url.searchParams.set('search_val1', Buffer.from(inDate).toString('base64'));
  url.searchParams.set('search_val2', Buffer.from(birthDate).toString('base64'));
  url.searchParams.set('search_val3', name);
  const browser = await playwrite.chromium.launch({ headless });
  const page = await browser.newPage();
  await page.goto(url.toString());
  await page.click('#childInfo1');
  await page.click('#letterBtn');
  await page.waitForNavigation();
  const [ popup ] = await Promise.all([
    page.waitForEvent('popup'),
    page.click('#fn_submit'),
  ]);
  await popup.waitForLoadState('load');
  await popup.waitForNavigation();
  await popup.click(`input[name="mobileco"][value="${passAuthAgency}"] ~ label`);
  await popup.click('[for="agree1"]');
  await popup.click('[for="agree2"]');
  await popup.click('[for="agree3"]');
  await popup.click('[for="agree4"]');
  await popup.click('#btnSubmit');
  await popup.waitForSelector('#qr_auth');
  await popup.click('#qr_auth');
  const code = await popup.innerText('#ct > div > fieldset > ul > li > ul > li:nth-child(1) > ul > li:nth-child(3) > span');
  await askModel(`PASS앱을 켜서 (${code}) 코드를 입력바랍니다. 입력하셨다면 OK를 눌러주세요.`);
  await popup.click('#btnSubmit');
  await (await popup.waitForEvent('dialog')).accept();
  await page.waitForNavigation();
  const form = (await page.$('form'))!;
  async function writeMessage ({ title, content }: DetailContent) {
    await page.evaluate(form => {
      const name = `hiddenIframe${Math.random()}`;
      form.setAttribute('target', name);
      const iframe = document.createElement('iframe');
      iframe.name = name;
      iframe.hidden = true;
      document.body.appendChild(iframe);
    }, form);
    await page.fill('#article_title', title);
    await page.fill('#article_text', content);
    await page.fill('#writer_password', password);
    await page.click('form input[type="submit"]');
    await (await page.waitForEvent('dialog')).accept();
  }
  return {
    browser,
    writeMessage
  };
}

export default async function writeArmyLetter (letterProps: Props) {
  const [news, { browser, writeMessage }] = await Promise.all([
    getNews(),
    openArmyLetterWriteForm(letterProps)
  ]);
  const date = new Date();
  const ymdhis = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분 실시간 뉴스`;
  const buildNews = buildArmyLetterContent(news);
  letterProps.logModel(`지금부터 ${buildNews.length}개의 편지를 보내겠습니다.`);
  for (const [index, processedNews] of Object.entries(buildNews)) {
    await writeMessage({
      title: `${ymdhis} #${index}`,
      content: processedNews
    });
  }
  await browser.close();
}