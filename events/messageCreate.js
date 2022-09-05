const sequelize = require('../sequelize');

const Users = sequelize.model('user');

module.exports = {
	name: 'messageCreate',
	async execute(msg) {
		if (!msg.author.bot && msg.channel.type !== 'dm') {

			let message = msg.content.replace(/ /g, '');

			if (message[message.length - 1] === '?') message = message.slice(0, -1);

			if (message.slice(-4).localeCompare('quoi', 'fr', { sensitivity: 'base' }) === 0) {
				const pourcentage = Math.floor(Math.random() * 101);

				let user = await Users.findOne({ where: { id: msg.author.id } });

				if (user) {
					Users.increment('count', { where: { id: msg.author.id } });
				}
				else {
					try {
						user = await Users.create({
							id: msg.author.id,
							username: msg.author.username,
						});
						user.increment('count');
					}
					catch (error) {
						console.log(error);
					}
				}

				if (pourcentage <= 5) {
					msg.reply('drilatère');
				}
				else {
					msg.reply('feur !');
				}
			}
		}
	},
};