import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import writeArmyLetter from './services/writeArmyLetter';

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
    return new Promise(resolve => {
      bot.on('callback_query', function callbackQuery (event) {
        if (event.data === 'OK') {
          resolve();
        }
        bot.off('callback_query', callbackQuery);
      });
      bot.sendMessage(chatId, question, {
        reply_markup : {
          inline_keyboard : [
            [{ 
              text: 'OK',
              callback_data: 'OK'
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
          headless: false,
          askModel: question => telegramAskModel(message.chat.id, question),
          logModel: log => {
            bot.sendMessage(message.chat.id, log);
          }
        });
      } catch (err) {
        bot.sendMessage(message.chat.id, `Error: ${err.message}`);
      }
    }
  });
}

main();