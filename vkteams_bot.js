const { MessageBuilder, MyTeamSDK } = require('myteam-bot-sdk');
const fetch = require("node-fetch");

// https://myteam.mail.ru/botapi/

let bot = {}

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
}

const commands = {
	members: logMembers,
};

const init = ({ token, apiUrl }) => {
	const sdk = new MyTeamSDK({ token, baseURL: apiUrl });
		
	getSelfInfo({ token, apiUrl });
	
	const waitingForInput = {};
	
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
	
		const waitingForInputKey = `${chatId}+${userId}`;
	
		if (waitingForInputKey in waitingForInput) {
	
			const command = waitingForInput[waitingForInputKey];
	
			delete waitingForInput[waitingForInputKey];
	
			commands[command](text);
	
			return;
		}
	
		const [, _command, context] = text.match(/^\/(\w+) ?([\w\W]+)?/) || [];
		const command = _command?.toLowerCase();
	
		if (commands[command]) {
			commands[command]({ sdk, text, msgId, chatId, type, userId, context });
		}
	
		console.log('==== newMessage', event);
	
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
	
	sdk.on('callbackQuery', (event) => {
		console.log('==== callbackQuery', event)
	});
	
	sdk.on('error', (error) => {
		console.error(error);
	});
	
	// sdk.addCommand('/foo', async (ctx) => {
	// 	ctx.sdk.sendText(ctx.event.payload.chat.chatId, 'bar');
	// });
	
	sdk.listen();
}

module.exports = {
	init,
};
