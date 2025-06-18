const { MessageBuilder, MyTeamSDK } = require('myteam-bot-sdk');
const fetch = require("node-fetch");
const { addToList, gitLogs, justWatch } = require("./git");
const fs = require('fs');

// https://myteam.mail.ru/botapi/

let bot = {};
const now = Date.now() + 1000;

const getSelfInfo = async ({ token, apiUrl }) => {
	const resp = await fetch(`${apiUrl}self/get?token=${token}`);
	const json = await resp.json();
	bot = json;
};

const _ping = async ({ sdk, pingHost, pingInterval, masterChatId }) => {
	ping(pingHost, pingInterval, sdk, masterChatId, true);
};
_ping.description = 'принудительный запуск проверки подключения к vpn';

const watch = async ({ sdk, chatId, context }) => {
	const branches = getBranchNames(context);

	if (branches) {
		justWatch(branches, async (txt) => {
			await sdk.sendText(chatId, txt);
		});
	} else {
		await sdk.sendText(chatId, `Не нашёл тут упоминания веток:\n"${context}"`);
	}
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
start.description = 'начало работы с ботом';

const getHelpList = (list) => {
	return Object.entries(list)
		.map(([key, func]) => {
			if (func.description) {
				return `/${key} - ${func.description}`;
			}

			return `/${key}`;
		})
		.join('\n');
};

const help = async ({ sdk, chatId, masterChatId }) => {
	if (chatId === masterChatId) {
		sdk.sendText(chatId, `${getHelpList(commands)}\n${getHelpList(masterCommands)}`);
	} else {
		sdk.sendText(chatId, getHelpList(commands));
	}
};
help.description = 'вывод этой подсказки';

const commands = {
	start,
	help,
	// watch,
};

const masterCommands = {
	logs: gitLogs,
	ping: _ping,
};

const getBranchNames = (text) => text.toLowerCase().match(/vkpl-\d+/g);

const skip = {};

let vpnStatus = true;
const ping = async (host, pingInterval, sdk, masterChatId, once = false) => {
	if (!host) {
		sdk.sendText(masterChatId, `Не настроен хост для пингования подключен ли VPN`);

		return;
	}

	try {
		await fetch(host, { signal: AbortSignal.timeout(10_000) });

		if (!vpnStatus && !once) {
			sdk.sendText(masterChatId, `😸 VPN снова в деле`);
		}

		vpnStatus = true;
	} catch (error) {
		if (vpnStatus && !once) {
			sdk.sendText(masterChatId, `😾 VPN помер`);
		}

		vpnStatus = false;
	}

	if (once) {
		sdk.sendText(masterChatId, vpnStatus ? '😸 VPN в норме' : '😾 VPN помер');
	} else {
		setTimeout(() => {
			ping(host, pingInterval, sdk, masterChatId);
		}, 1000 * pingInterval)
	}
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

		const _text = text || event?.payload?.parts?.[0].payload?.message?.text || '';

		const [, _command, context] = _text.match(/^\/(\w+) ?([\w\W]+)?/) || [];
		const command = _command?.toLowerCase();
	
		if (commands[command]) {
			commands[command]({ sdk, text, msgId, chatId, type, userId, context, masterChatId });

			return;
		}

		if (chatId === masterChatId && masterCommands[command]) {
			masterCommands[command]({ sdk, text, msgId, chatId, type, userId, context, pingHost, pingInterval, masterChatId });

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
