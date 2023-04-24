require("dotenv").config();
const { init: initChatBot } = require("./vkteams_bot");

const { VKTEAMS_TOKEN, VKTEAMS_API_URL } = process.env;

initChatBot({
	token: VKTEAMS_TOKEN,
	apiUrl: VKTEAMS_API_URL,
});
