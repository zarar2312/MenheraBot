import { MessageEmbed } from 'discord.js';
import Command from '@structures/Command';
import http from '@utils/HTTPrequests';
import MenheraClient from 'MenheraClient';
import CommandContext from '@structures/CommandContext';

export default class PokeCommand extends Command {
  constructor(client: MenheraClient) {
    super(client, {
      name: 'poke',
      aliases: ['cutucar'],
      clientPermissions: ['EMBED_LINKS'],
      category: 'ações',
    });
  }

  async run(ctx: CommandContext): Promise<void> {
    const rand = await http.getAssetImageUrl('poke');
    const user = ctx.message.mentions.users.first();

    if (!user) {
      await ctx.replyT('error', 'commands:poke.no-mention');
      return;
    }

    if (user === ctx.message.author) {
      await ctx.replyT('error', 'commands:poke.self-mention');
      return;
    }

    const avatar = ctx.message.author.displayAvatarURL({ format: 'png', dynamic: true });

    const embed = new MessageEmbed()
      .setTitle(ctx.locale('commands:poke.embed_title'))
      .setColor('#000000')
      .setDescription(
        `${ctx.message.author} ${ctx.locale('commands:poke.embed_description')} ${user}`,
      )
      .setImage(rand)
      .setThumbnail(avatar)
      .setAuthor(ctx.message.author.tag, avatar);

    await ctx.send(embed);
  }
}