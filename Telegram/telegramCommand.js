require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const userService=require("../routes/services/userService")

const token = "7446508224:AAF0s4gvrc_KD8_oxD3whbvKmrDkTLl0C9c"; // Fetch from environment variables
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = chatId; // Use the chat ID as the user ID or adjust based on your system

  try {
    bot.sendMessage(
      chatId,
      `Please follow the instructions below for Telegram 2-Step verification:\n
        1. Find <a href="https://t.me/BgSecureAuth_bot"> @BgSecureAuth_bot </a> in your Telegram and type /start.\n
        2. After this, type /connect {connectionId} and send it to the bot.\n
        Now your Telegram account will be linked with your website account and 2-Step verification will be enabled.`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error handling /start command:", error);
    bot.sendMessage(
      chatId,
      "An error occurred while processing your request. Please try again later."
    );
  }
});

// bot.onText(/\/connect/, async (msg) => {
//     const chatId = msg.chat.id;
//     const userId = chatId; // Use the chat ID as the user ID or adjust based on your system

//     try {
//       // Generate a connection ID and send instructions
//       // const connectionId = await createConnectionId(userId);
//       bot.sendMessage(chatId, `Please provide a valid Connection ID  /connect [Connection Id].

//       If you need assistance with creating a Connection ID, please contact the administrator.`, {parse_mode: 'HTML'});
//     } catch (error) {
//       console.error('Error handling /start command:', error);
//       bot.sendMessage(chatId, 'An error occurred while processing your request');
//     }
//   });

bot.onText(/\/connect (\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const connection_id = match[1];

  try {
    // Fetch the user record by connection_id
    const userRecordResponse = await userService.findByConnectionId(connection_id);

    // console.log(userRecordResponse)
    if (userRecordResponse && userRecordResponse.data) {
      const userRecord = userRecordResponse.data;
    // console.log(userRecord)
      if (userRecord.telegram_connected==0) {
        // console.log(!userRecord.telegram_connected==0)
        userRecord.telegram_connected = true; 
        userRecord.chatId = chatId;

        const saveResponse = await userService.saveTelegramUserRecord(
          userRecord.telegram_connected,
          userRecord.chatId,
          connection_id
        );

        if (saveResponse ) { // Assuming 200 for success
          bot.sendMessage(chatId, "Your account has been successfully connected to Telegram.");
        } else {
          throw new Error("Failed to update the user record.");
        }
      } else {
        bot.sendMessage(chatId, "Your account is already connected to Telegram.");
      }
    } else {
      bot.sendMessage(chatId, "Connection ID not found.");
    }
  } catch (error) {
    console.error("Error updating user record:", error);
    bot.sendMessage(chatId, "An error occurred while connecting your account. Please try again later.");
  }
});


