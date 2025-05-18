require("dotenv").config();
const { init: initChatBot } = require("./vkteams_bot");

const { VKTEAMS_TOKEN, VKTEAMS_API_URL, MASTER_CHAT_ID, PING_HOST, PING_INTERVAL_SEC } = process.env;

initChatBot({
	token: VKTEAMS_TOKEN,
	apiUrl: VKTEAMS_API_URL,
	masterChatId: MASTER_CHAT_ID,
	pingHost: PING_HOST,
	pingInterval: isNaN(parseInt(PING_INTERVAL_SEC)) ? 600 : parseInt(PING_INTERVAL_SEC),
});
