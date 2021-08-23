import MenheraClient from 'MenheraClient';
import { COLORS } from '@structures/MenheraConstants';
import InteractionCommand from '@structures/command/InteractionCommand';
import InteractionCommandContext from '@structures/command/InteractionContext';
import { MessageButton, MessageComponentInteraction, MessageEmbed, User } from 'discord.js';
import Util from '@utils/Util';
import HttpRequests from '@utils/HTTPrequests';

export default class SarrarInteractionCommand extends InteractionCommand {
  constructor(client: MenheraClient) {
    super(client, {
      name: 'sarrar',
      description: '「🦧」・Invoca o poder dos irmãos Berti para fazer a lendária sarrada',
      options: [
        {
          name: 'user',
          type: 'USER',
          description: 'Convoque alguém para sarrar contigo',
          required: false,
        },
      ],
      category: 'actions',
      cooldown: 5,
      clientPermissions: ['EMBED_LINKS'],
    });
  }

  static async sarrada(ctx: InteractionCommandContext, user: User): Promise<void> {
    const rand = await HttpRequests.getAssetImageUrl('sarrar');

    const avatar = ctx.interaction.user.displayAvatarURL({ format: 'png', dynamic: true });

    const embed = new MessageEmbed()
      .setTitle(ctx.locale('commands:sarrar.embed_title'))
      .setColor(COLORS.ACTIONS)
      .setDescription(
        ctx.locale('commands:sarrar.embed_description', {
          author: ctx.interaction.user.toString(),
          mention: user.toString(),
        }),
      )
      .setImage(rand)
      .setThumbnail(avatar);

    if (ctx.interaction.replied) ctx.editReply({ embeds: [embed], components: [] });
    else ctx.reply({ embeds: [embed], components: [] });
  }

  async run(ctx: InteractionCommandContext): Promise<void> {
    const user = ctx.options.getUser('user');

    if (user && user.id !== ctx.interaction.user.id) {
      SarrarInteractionCommand.sarrada(ctx, user);
      return;
    }

    const randSozinho = await HttpRequests.getAssetImageUrl('sarrar_sozinho');
    const embed = new MessageEmbed()
      .setTitle(ctx.locale('commands:sarrar.no-mention.embed_title'))
      .setColor(COLORS.ACTIONS)
      .setDescription(
        ctx.locale('commands:sarrar.no-mention.embed_description', {
          author: ctx.interaction.user.toString(),
        }),
      )
      .setImage(randSozinho)
      .setThumbnail(ctx.interaction.user.displayAvatarURL())
      .setFooter(ctx.locale('commands:sarrar.no-mention.embed_footer'));

    const Button = new MessageButton()
      .setCustomId(ctx.interaction.id)
      .setLabel(ctx.locale('commands:sarrar.sarrar'))
      .setStyle('PRIMARY');

    ctx.reply({
      embeds: [embed],
      components: [{ type: 'ACTION_ROW', components: [Button] }],
    });

    const filter = (int: MessageComponentInteraction) =>
      int.user.id !== ctx.interaction.user.id &&
      !int.user.bot &&
      int.customId === ctx.interaction.id;

    const collected = await Util.collectComponentInteractionWithCustomFilter(
      ctx.channel,
      filter,
      30000,
    ).catch(() => null);

    if (!collected) {
      ctx.editReply({
        embeds: [embed],
        components: [
          {
            type: 'ACTION_ROW',
            components: [
              Button.setDisabled(true).setLabel(ctx.locale('common:timesup')).setStyle('SECONDARY'),
            ],
          },
        ],
      });
      return;
    }

    SarrarInteractionCommand.sarrada(ctx, collected.user);
  }
}