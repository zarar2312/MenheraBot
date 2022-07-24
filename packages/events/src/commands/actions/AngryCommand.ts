import { User } from 'discordeno/transformers';
import { ApplicationCommandOptionTypes } from 'discordeno/types';

import { TODAYS_YEAR, COLORS } from '../../structures/constants';
import { getAssetLink } from '../../structures/cdnManager';
import { getUserAvatar, mentionUser } from '../../utils/discord/userUtils';
import { ChatInputInteractionCommand } from '../../types/commands';
import { createEmbed } from '../../utils/discord/createEmbed';
import { capitalize } from '../../utils/stringUtils';

const AngryCommand: ChatInputInteractionCommand = {
  path: '',
  name: 'raiva',
  nameLocalizations: { 'en-US': 'angry' },
  description: '「😡」・Mostre a todos que está com raiva',
  descriptionLocalizations: { 'en-US': '「😡」・Shows to everyone that you are angry' },
  options: [
    {
      name: 'user',
      type: ApplicationCommandOptionTypes.User,
      description: 'Usuário que te deixou com raiva',
      descriptionLocalizations: { 'en-US': 'User that made you angry' },
      required: false,
    },
    {
      name: 'motivo',
      nameLocalizations: { 'en-US': 'reason' },
      type: ApplicationCommandOptionTypes.User,
      description: 'Por que você está com raiva?',
      descriptionLocalizations: { 'en-US': 'Why are you angry?' },
      required: false,
    },
  ],
  category: 'actions',
  authorDataFields: [],
  dmPermission: false,
  execute: async (ctx) => {
    const user = ctx.getOption<User>('user', 'users', false);
    const reason = ctx.getOption<string>('motivo', false);

    if (user?.toggles?.bot) {
      ctx.makeMessage({
        content: ctx.prettyResponse('error', 'commands:raiva.bot'),
      });
      return;
    }

    const avatar = getUserAvatar(ctx.author, { enableGif: true });
    const selectedImage = getAssetLink('angry');

    if (!user || user.id === ctx.author.id) {
      const embed = createEmbed({
        title: ctx.locale('commands:raiva.no-mention.embed_title'),
        color: COLORS.ACTIONS,
        description: ctx.locale('commands:raiva.no-mention.embed_description', {
          author: mentionUser(ctx.author.id),
        }),
        thumbnail: { url: avatar },
        image: { url: selectedImage },
      });

      if (reason)
        embed.description = `${embed.description}\n\n_"${capitalize(
          reason,
        )}"_ - ${ctx.author.username.toUpperCase()}, ${TODAYS_YEAR}`;

      await ctx.makeMessage({ embeds: [embed] });
      return;
    }

    const embed = createEmbed({
      title: ctx.locale('commands:raiva.no-mention.embed_title'),
      description: ctx.locale('commands:raiva.embed_description', {
        author: mentionUser(ctx.author.id),
        mention: mentionUser(user.id),
      }),
      image: { url: selectedImage },
      color: COLORS.ACTIONS,
      thumbnail: { url: avatar },
    });

    if (reason)
      embed.description = `${embed.description}\n\n_"${capitalize(
        reason,
      )}"_ - ${ctx.author.username.toUpperCase()}, ${TODAYS_YEAR}`;

    await ctx.makeMessage({ embeds: [embed] });
  },
};

export default AngryCommand;
