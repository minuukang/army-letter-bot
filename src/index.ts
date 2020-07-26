import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import writeArmyLetter from './services/writeArmyLetter';
import getNews from './api/news';
import buildArmyLetterContent from './helpers/buildArmyLetterContent';
import telegramAskModel, { TelegramAskCancelError } from './helpers/telegramAskModel';

dotenv.config();

async function main () {
  const config = {
    telegramToken: process.env.TELEGRAM_TOKEN!,
    inDate: process.env.ARMY_IN_DATE!,
    birthDate: process.env.ARMY_BIRTH_DATE!,
    name: process.env.ARMY_NAME!,
    password: process.env.LETTER_PASSWORD!,
    passAuthAgency: process.env.PASS_AUTH_AGENCY!,
  };

  if (Object.values(config).some(value => !value)) {
    throw new Error('Please set your .env file');
  }

  const bot = new TelegramBot(config.telegramToken, {
    polling: true
  });

  bot.on('message', async message => {
    if (message.text?.includes('뉴스보내줘')) {
      await bot.sendMessage(message.chat.id, '알겠습니다.');
      try {
        const [news, { browser, writeMessage }] = await Promise.all([
          getNews(),
          writeArmyLetter({
            ...config,
            headless: false,
            askModel: question => telegramAskModel({
              bot,
              chatId: message.chat.id,
              question
            })
          })
        ]);
        const date = new Date();
        const ymdhis = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분 실시간 뉴스`;
        const buildNews = buildArmyLetterContent(news);
        const progressMessage = await bot.sendMessage(message.chat.id, `${buildNews.length}개의 편지 중 0개 보내기 완료 (0%)`);
        try {
          for (const [index, processedNews] of Object.entries(buildNews)) {
            await writeMessage({
              title: `${ymdhis} #${index}`,
              content: processedNews
            });
            await bot.editMessageText(`${buildNews.length}개의 편지 중 ${index + 1}개 보내기 완료 (${Number(index) / buildNews.length * 100}%)`, {
              chat_id: message.chat.id,
              message_id: progressMessage.message_id
            });
          }
        } finally {
          await browser.close();
        }
        await bot.sendMessage(message.chat.id, '이용해주셔서 감사합니다.');
      } catch (err) {
        if (err instanceof TelegramAskCancelError) {
          await bot.sendMessage(message.chat.id, '취소되었습니다. 다음에 이용해주시길 바랍니다.');
        } else {
          await bot.sendMessage(message.chat.id, `Error: ${err.message}`);
        }
      }
    }
  });
}

main();