const Command = require('../../structures/command');

module.exports = class DivorceCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'divorce',
      aliases: ['divorciar'],
      cooldown: 10,
      category: 'diversão',
      clientPermissions: ['EMBED_LINKS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
    });
  }

  async run({ message, user }, t) {
    if (user.casado && user.casado !== 'false') {
      return this.divorciar(user, message, t);
    } message.menheraReply('warn', t('commands:divorce.author-single'));
  }

  async divorciar(user, message, t) {
    const user2 = await this.client.database.Users.findOne({ id: user.casado });

    const user2Mention = this.client.users.cache.get(user.casado) || user2.nome;

    message.channel.send(`${t('commands:divorce.confirmation')} ${user2Mention}`).then((msg) => {
      msg.react('✅');
      msg.react('❌');

      const filterYes = (reaction, usuario) => reaction.emoji.name === '✅' && usuario.id === message.author.id;
      const filterNo = (reação, u) => reação.emoji.name === '❌' && u.id === message.author.id;

      const yesColetor = msg.createReactionCollector(filterYes, { max: 1, time: 14500 });
      const noColetor = msg.createReactionCollector(filterNo, { max: 1, time: 14500 });

      noColetor.on('collect', () => {
        msg.reactions.removeAll().catch();
        message.menheraReply('success', t('commands:divorce.canceled'));
      });

      yesColetor.on('collect', () => {
        msg.reactions.removeAll().catch();
        message.channel.send(`${message.author} ${t('commands:divorce.confirmed_start')} ${user2Mention}. ${t('commands:divorce.confirmed_end')}`);

        user.casado = 'false';
        user.data = 'null';
        user2.casado = false;
        user2.data = 'null';

        user.save();
        user2.save();
      });
    });
  }
};
