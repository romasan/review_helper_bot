const { MessageBuilder, MyTeamSDK } = require('myteam-bot-sdk');
const fetch = require("node-fetch");
const { addToList, gitLogs } = require("./git");
const fs = require('fs');

// https://myteam.mail.ru/botapi/

let bot = {};
const now = Date.now() + 1000;

const getSelfInfo = async ({ token, apiUrl }) => {
	const resp = await fetch(`${apiUrl}self/get?token=${token}`);
	const json = await resp.json();
	bot = json;
};

const logMembers = async ({ sdk, chatId, type }) => {
	
	if (type !== 'group') {
		sdk.sendText(chatId, '⛔ Эта комманда работает только в чате');
		return;
	}

	const _members = await sdk.getMembers(chatId);
	const members = _members
		.filter((member) => member.userId !== bot.userId)
		.map((member) => member.userId);

	sdk.sendText(chatId, `members:\n${members.join('\n')}`);
};

const helpText = `\
бот понимает сообщения в фомате
vkpl-1234
https://jira.vk.team/browse/VKPL-1234
https://vkpl-1234.founder-tv-alpha.my.cloud.devmail.ru/
`;

const start = async ({ sdk, chatId, type }) => {
	sdk.sendText(chatId, helpText);
};

const help = async ({ sdk, chatId, type }) => {
	sdk.sendText(chatId, Object.keys(commands).map(e => `/${e}`).join('\n'));
};

const commands = {
	// members: logMembers,
	start,
	// help,
};

// const logs = 

const masterCommands = {
	logs: gitLogs,
};

const getBranchNames = (text) => text.toLowerCase().match(/vkpl-\d+/g);

const skip = {};

let vpnStatus = true;
const ping = async (host, pingInterval, sdk, masterChatId) => {
	if (!host) {
		sdk.sendText(masterChatId, `Не настроен хост для пингования подключен ли VPN`);

		return;
	}

	console.log('ping', host);

	try {
		await fetch(host, { signal: AbortSignal.timeout(10_000) });

		console.log('ping OK');

		if (!vpnStatus) {
			sdk.sendText(masterChatId, `😸 VPN снова в деле`);
		}

		vpnStatus = true;
	} catch (error) {
		console.log('ping FAIL');

		if (vpnStatus) {
			sdk.sendText(masterChatId, `😾 VPN помер`);
		}

		vpnStatus = false;
	}

	setTimeout(() => {
		ping(host, pingInterval, sdk, masterChatId);
	}, 1000 * pingInterval)
};

const init = ({ token, apiUrl, masterChatId, pingHost, pingInterval }) => {
	// console.log('==== INIT', { token, apiUrl });
	console.log('Start chat bot', new Date());

	const sdk = new MyTeamSDK({ token, baseURL: apiUrl });

	ping(pingHost, pingInterval, sdk, masterChatId);
		
	getSelfInfo({ token, apiUrl });
	
	// const waitingForInput = {};
	
	sdk.on('newMessage', (event) => {
		const {
			text,
			msgId,
			chat: {
				chatId,
				type,
			},
			from: {
				userId,
			},
		} = event.payload;

		try {
			const postfix = Array(4).fill().map(() => parseInt(Math.random() * 10)).join('');

			fs.writeFileSync(`${__dirname}/logs/${Date.now()}-${chatId}-${postfix}`, JSON.stringify(event.payload, null, 2));
		} catch (ignore) {}

		// console.log('==== newMessage:parts', event?.payload?.parts?.[0].payload?.message?.text);

		if (Date.now() <= now) {
			console.log(`SKIP: ${text}`);

			if (!skip[chatId]) {
				sdk.sendText(chatId, `Привет, я вернулся, если нужна моя помощь повтори сообщение`);
			}

			skip[chatId] = true;

			return;
		}
	
		// const waitingForInputKey = `${chatId}+${userId}`;
	
		// if (waitingForInputKey in waitingForInput) {
	
		// 	const command = waitingForInput[waitingForInputKey];
	
		// 	delete waitingForInput[waitingForInputKey];
	
		// 	commands[command](text);
	
		// 	return;
		// }

		const _text = text || event?.payload?.parts?.[0].payload?.message?.text || '';

		const [, _command, context] = _text.match(/^\/(\w+) ?([\w\W]+)?/) || [];
		const command = _command?.toLowerCase();
	
		if (commands[command]) {
			commands[command]({ sdk, text, msgId, chatId, type, userId, context });

			return;
		}

		if (chatId === masterChatId && masterCommands[command]) {
			masterCommands[command]({ sdk, text, msgId, chatId, type, userId, context });

			return;
		}

		const branches = getBranchNames(_text);

		if (branches) {
			addToList(branches, async (txt) => {
				await sdk.sendText(chatId, txt);
			});
		} else {
			sdk.sendText(chatId, `❌ ничего не понял)\n${helpText}`);
		}
	
		// const message = new MessageBuilder()
		// 	.text('📊')
		// 	.text('foo')
		// 	.formatText('bold', 'bar')
		// 	// .buttonRow()
		// 	.button({
		// 		style: 'primary',
		// 		text: `BTN 1`,
		// 		callbackData: JSON.stringify({ xxx: 123 }),
		// 	})
		// 	.button({
		// 		style: 'primary',
		// 		text: `BTN 2`,
		// 		callbackData: JSON.stringify({ xxx: 456 }),
		// 	});
	
		// sdk.sendText(chatId, 'https://www.pngall.com/wp-content/uploads/8/Sample-PNG-Image.png');
	
		// sdk.sendText(chatId, 'bar');
	});
	
	// sdk.on('callbackQuery', (event) => {
	// 	console.log('==== callbackQuery', event)
	// });
	
	// sdk.on('error', (error) => {
	// 	console.error(error);
	// });
	
	// sdk.addCommand('/foo', async (ctx) => {
	// 	ctx.sdk.sendText(ctx.event.payload.chat.chatId, 'bar');
	// });
	
	sdk.listen();
}

module.exports = {
	init,
};
