import TelegramBot from 'node-telegram-bot-api';

interface TelegramAskModelOptions {
  bot: TelegramBot;
  chatId: number;
  question: string;
}

export class TelegramAskCancelError extends Error {}

const MAX_WAITING_TIME = 120 * 1000;

export default function telegramAskModel ({ bot, chatId, question }: TelegramAskModelOptions): Promise<unknown> {
  return Promise.race([
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new TelegramAskCancelError()), MAX_WAITING_TIME)
    }),
    new Promise((resolve, reject) => {
      bot.on('callback_query', function callbackQuery (event) {
        bot.off('callback_query', callbackQuery);
        if (event.data === 'OK') {
          resolve();
        } else {
          reject(new TelegramAskCancelError());
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
    })
  ]);
}