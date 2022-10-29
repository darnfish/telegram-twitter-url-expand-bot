import * as dotenv from "dotenv";
import Tgfancy from "tgfancy";
import { fetchTweet } from "./helpers/tweet-parser.js";
import { trackEvent } from "./helpers/analytics.js";
import { createSettings, getSettings, updateSettings } from "./helpers/api.js";
import { askToExpand } from "./actions/ask-to-expand.js";

dotenv.config();
export const API_ENDPOINT = `${process.env.API_URL}?access_token=${process.env.API_TOKEN}`;
const TWITTER_INSTAGRAM_URL =
  /https?:\/\/(?:www\.)?(?:mobile\.)?(?:twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)|instagram\.com\/(?:p|reel)\/([A-Za-z0-9-_]+))/gim;
export const bot = new Tgfancy(process.env.BOT_TOKEN, { polling: true });

// Match Twitter or Instagram links
bot.onText(TWITTER_INSTAGRAM_URL, async (msg) => {
  // Get the current Chat ID
  const chatId = msg.chat.id;
  // Get message text to parse links from
  const msgText = msg.text;
  // Get settings for this chat
  const settings = await getSettings(chatId).then((data) => data);

  const askToExpandAllLinksInMessage = async () => {
    msgText.match(TWITTER_INSTAGRAM_URL).forEach((link) => {
      const isInstagram = link.includes("instagram.com");
      askToExpand(msg, chatId, link, isInstagram);
    });
  };

  if (!!settings) {
    // If settings exist, check if this chat has autoexpand enabled
    if (settings.autoexpand) {
      // Iterate through all matched links in the message
      msgText.match(TWITTER_INSTAGRAM_URL).forEach((link) => {
        const isInstagram = link.includes("instagram.com");
        console.log("link should autoexpand in this chat right here");
        console.log(msg.from);
        // @msg.from.username || msg.from.first_name (and msg.from.last_name if it exists)
        trackEvent(isInstagram ? "instagram.link.autoexpand" : "twitter.link.autoexpand");
      });
    } else {
      // Iterate through all matched links in the message
      askToExpandAllLinksInMessage();
    }
  } else {
    // If settings don’t exist, create default settings for this chat
    createSettings(chatId, false);
    // Iterate through all matched links in the message
    askToExpandAllLinksInMessage();
  }
});

// React to inline keyboard reply
bot.on("callback_query", async (answer) => {
  const chatId = answer.message.chat.id;
  const msgId = answer.message.message_id;
  const link = answer.data;
  const isInstagram = link.includes("instagram");

  if (link.startsWith("no.")) {
    // Delete the bot reply so it doesn’t spam the chat
    bot.deleteMessage(chatId, msgId);
    trackEvent(isInstagram ? "instagram.link.cancel" : "twitter.link.cancel");
    return;
  }

  if (link.startsWith("undo.")) {
    // Undo the link expansion and delete the bot reply
    bot.deleteMessage(chatId, msgId);
    trackEvent(isInstagram ? "instagram.link.undo" : "twitter.link.undo");
    return;
  }

  const expandLink = (url) => {
    // TODO: if autoexpand is enabled, do not include undo option and don’t reply to a deleted message
    // reply_to_message_id: null ??
    bot.editMessageText(url, {
      chat_id: chatId,
      message_id: msgId,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "↩️ Undo",
              callback_data: isInstagram ? "undo.instagram" : "undo.twitter",
              // callback_data has a 64 byte limit!!!
            },
          ],
        ],
      },
    });

    trackEvent(isInstagram ? "instagram.link.expand" : "twitter.link.expand");
  };

  if (isInstagram) {
    // Replace Instagram link
    const newLink = link.replace("instagram.com", "ddinstagram.com");
    expandLink(newLink);
  } else {
    // Check if tweet has multiple images
    fetchTweet(link)
      .then((hasImages) => {
        const replacement = hasImages ? "c.vxtwitter.com" : "vxtwitter.com";
        const newLink = link.replace("twitter.com", replacement);
        // Replace the reply with an expanded Tweet link
        expandLink(newLink);
        if (hasImages) trackEvent("twitter.link.multipleImages");
      })
      .catch((error) => {
        console.error(error);
        // Fallback to vxtwitter.com if the API call fails
        const newLink = link.replace("twitter.com", "vxtwitter.com");
        expandLink(newLink);
      });
  }
});

// Handle settings
bot.onText(/^\/autoexpandon/, async (msg) => {
  // Get the current Chat ID
  const chatId = msg.chat.id;
  const settings = await getSettings(chatId).then((data) => data);

  if (settings) {
    if (!settings.autoexpand) {
      updateSettings(settings.id, true);
    }
  } else {
    createSettings(chatId, true);
  }

  bot.sendMessage(chatId, `✅ I will auto-expand Twitter & Instagram links in this chat.`, {
    reply_to_message_id: msg.message_id,
  });

  trackEvent("command.autoexpand.on");
});

bot.onText(/^\/autoexpandoff/, async (msg) => {
  // Get the current Chat ID
  const chatId = msg.chat.id;
  const settings = await getSettings(chatId).then((data) => data);

  if (settings) {
    if (settings.autoexpand) {
      updateSettings(settings.id, false);
    }
  } else {
    createSettings(chatId, false);
  }

  bot.sendMessage(chatId, `❌ I will no longer auto-expand Twitter & Instagram links in this chat.`, {
    reply_to_message_id: msg.message_id,
  });

  trackEvent("command.autoexpand.off");
});

bot.onText(/^\/admin/, async (msg) => {
  // Get the current Chat ID
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `An admin of this chat needs to give this bot admin permissions to automatically delete messages when expanding links.`,
    {
      reply_to_message_id: msg.message_id,
    }
  );

  trackEvent("command.admin");
});

bot.onText(/^\/source/, async (msg) => {
  // Get the current Chat ID
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `This bot’s source code is available on GitHub: https://github.com/pugson/telegram-twitter-url-expand-bot`,
    {
      reply_to_message_id: msg.message_id,
    }
  );

  trackEvent("command.sourceCode");
});
