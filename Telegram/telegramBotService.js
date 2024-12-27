// telegramBotService.js
const TelegramBot = require('node-telegram-bot-api');
const token = "7446508224:AAF0s4gvrc_KD8_oxD3whbvKmrDkTLl0C9c"; // Fetch from environment variables
const bot = new TelegramBot(token);

const sendMessage = (chatId, message) => {
  return bot.sendMessage(chatId, message);
};

module.exports = { sendMessage };
