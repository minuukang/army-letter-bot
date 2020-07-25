import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import writeArmyLetter from './services/writeArmyLetter';
import { reject } from 'lodash';

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

  function telegramAskModel (chatId: number, question: string): Promise<void> {
    return new Promise((resolve, reject) => {
      bot.on('callback_query', function callbackQuery (event) {
        bot.off('callback_query', callbackQuery);
        if (event.data === 'OK') {
          resolve();
        } else {
          reject();
        }
      });
      bot.sendMessage(chatId, question, {
        reply_markup : {
          inline_keyboard : [
            [{
              text: 'OK',
              callback_data: 'OK'
            }, {
              text: 'Cancel',
              callback_data: 'Cancel'
            }]
          ]
        }
      });
    });
  }

  bot.on('message', async message => {
    if (message.text?.includes('뉴스보내줘')) {
      bot.sendMessage(message.chat.id, '알겠습니다.');
      try {
        await writeArmyLetter({
          ...config,
          askModel: async question => {
            await Promise.race([
              telegramAskModel(message.chat.id, question),
              new Promise((_resolve, reject) => setTimeout(reject, 30 * 1000))
            ]);
          },
          logModel: log => {
            bot.sendMessage(message.chat.id, log);
          }
        });
        bot.sendMessage(message.chat.id, '이용해주셔서 감사합니다.');
      } catch (err) {
        bot.sendMessage(message.chat.id, `Error: ${err.message}`);
      }
    }
  });
}

main();