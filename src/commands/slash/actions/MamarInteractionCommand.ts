import MenheraClient from 'MenheraClient';
import { COLORS } from '@structures/MenheraConstants';
import InteractionCommand from '@structures/command/InteractionCommand';
import InteractionCommandContext from '@structures/command/InteractionContext';
import { MessageEmbed, User } from 'discord.js';
import HttpRequests from '@utils/HTTPrequests';

export default class MamarInteractionCommand extends InteractionCommand {
  constructor(client: MenheraClient) {
    super(client, {
      name: 'mamar',
      description:
        '「🧉」・Principal comando da Menhera. De uma mamada de Qualidade monstra em alguém',
      category: 'actions',
      options: [
        {
          type: 'USER',
          name: 'user',
          description: 'Usuário que você quer mamar',
          required: true,
        },
      ],
      cooldown: 5,
      clientPermissions: ['EMBED_LINKS'],
    });
  }

  async run(ctx: InteractionCommandContext): Promise<void> {
    const mention = ctx.args[0].user as User;

    if (mention.bot) {
      await ctx.replyT(
        'warn',
        ctx.locale('commands:mamar.bot', {
          author: ctx.interaction.user.toString(),
          mention: mention.toString(),
        }),
      );
      return;
    }

    if (mention.id === ctx.interaction.user.id) {
      await ctx.replyT('error', 'commands:mamar.self-mention', {}, true);
      return;
    }

    const rand = await HttpRequests.getAssetImageUrl('mamar');
    const avatar = ctx.interaction.user.displayAvatarURL({ format: 'png', dynamic: true });
    const embed = new MessageEmbed()
      .setTitle(ctx.locale('commands:mamar.embed_title'))
      .setColor(COLORS.ACTIONS)
      .setDescription(
        ctx.locale('commands:mamar.embed_description', {
          author: ctx.interaction.user.toString(),
          mention: mention.toString(),
        }),
      )
      .setImage(rand)
      .setThumbnail(avatar);

    await ctx.reply({ embeds: [embed] });
    await ctx.client.repositories.mamarRepository.mamar(ctx.interaction.user.id, mention.id);
  }
}