import MenheraClient from 'MenheraClient';
import { COLORS } from '@structures/MenheraConstants';
import InteractionCommand from '@structures/command/InteractionCommand';
import InteractionCommandContext from '@structures/command/InteractionContext';
import { MessageEmbed } from 'discord.js';
import HttpRequests from '@utils/HTTPrequests';

export default class ShyInteractionCommand extends InteractionCommand {
  constructor(client: MenheraClient) {
    super(client, {
      name: 'vergonha',
      description: '「👉👈」・E-eto >.<, oto com vergonhinha',
      options: [
        {
          name: 'user',
          type: 'USER',
          description: 'Usuário que te deixou com vergonha',
          required: false,
        },
      ],
      category: 'actions',
      cooldown: 5,
      clientPermissions: ['EMBED_LINKS'],
    });
  }

  async run(ctx: InteractionCommandContext): Promise<void> {
    const avatar = ctx.interaction.user.displayAvatarURL({ format: 'png', dynamic: true });

    const rand = await HttpRequests.getAssetImageUrl('shy');
    const user = ctx.args[0]?.user;

    if (!user || user.id === ctx.interaction.user.id) {
      const embed = new MessageEmbed()
        .setTitle(ctx.locale('commands:shy.no-mention.embed_title'))
        .setColor(COLORS.ACTIONS)
        .setDescription(
          ctx.locale('commands:shy.no-mention.embed_description', {
            author: ctx.interaction.user.toString(),
          }),
        )
        .setThumbnail(avatar)
        .setImage(rand);

      await ctx.reply({ embeds: [embed] });
      return;
    }

    const embed = new MessageEmbed()
      .setTitle(ctx.locale('commands:shy.embed_title'))
      .setColor(COLORS.ACTIONS)
      .setDescription(
        ctx.locale('commands:shy.embed_description', {
          author: ctx.interaction.user.toString(),
          mention: user.toString(),
        }),
      )
      .setImage(rand)
      .setThumbnail(avatar);

    await ctx.reply({ embeds: [embed] });
  }
}