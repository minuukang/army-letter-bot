import playwrite from 'playwright';
import { DetailContent } from '../api/news';

interface Props {
  inDate: string;
  birthDate: string;
  name: string;
  password: string;
  passAuthAgency: string;
  askModel: (question: string) => Promise<unknown>;
  headless?: boolean;
}

const pageUrl = 'http://www.katc.mil.kr/katc/community/children.jsp';

export default async function writeArmyLetter ({ inDate, birthDate, name, password, passAuthAgency, askModel, headless }: Props) {
  const url = new URL(pageUrl);
  url.searchParams.set('search_val1', Buffer.from(inDate).toString('base64'));
  url.searchParams.set('search_val2', Buffer.from(birthDate).toString('base64'));
  url.searchParams.set('search_val3', name);
  const browser = await playwrite.chromium.launch({ headless });
  try {
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
    return {
      browser,
      writeMessage: async function writeMessage ({ title, content }: DetailContent) {
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
    };
  } catch (err) {
    await browser.close();
    throw err;
  }
}