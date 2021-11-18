/* eslint-disable no-unused-expressions */
import { MessageEmbed } from 'discord.js-light';
import InteractionCommand from '@structures/command/InteractionCommand';
import InteractionCommandContext from '@structures/command/InteractionContext';
import { IUserSchema } from 'types/Types';

export default class AvatarInteractionCommand extends InteractionCommand {
  constructor() {
    super({
      name: 'avatar',
      description: '「📸」・Mostra a foto de perfil de alguém',
      category: 'info',
      options: [
        {
          type: 'USER',
          name: 'user',
          description: 'Usuário para mostrar a foto de perfil',
          required: false,
        },
      ],
      cooldown: 5,
      authorDataFields: ['selectedColor'],
    });
  }

  async run(ctx: InteractionCommandContext): Promise<void> {
    const authorData = ctx.data.user;

    let { user } = ctx.interaction;
    let db: IUserSchema | null = authorData;

    const mentionUser = ctx.options.getUser('user');

    if (mentionUser && mentionUser.id !== ctx.author.id) {
      try {
        user = await ctx.client.users.fetch(mentionUser.id);
        db = await ctx.client.repositories.userRepository.find(user.id, ['selectedColor']);
      } catch {
        await ctx.makeMessage({
          content: ctx.prettyResponse('error', 'commands:avatar.unknow-user'),
          ephemeral: true,
        });
        return;
      }
    }

    const cor = db?.selectedColor ?? ('#a788ff' as const);

    const img = user.displayAvatarURL({ dynamic: true, size: 1024 });

    const embed = new MessageEmbed()
      .setTitle(ctx.locale('commands:avatar.title', { user: user.username }))
      .setImage(img)
      .setColor(cor)
      .setFooter(ctx.locale('commands:avatar.footer'));

    if (user.id === ctx.client.user?.id) {
      embed.setTitle(ctx.locale('commands:avatar.client_title', { user: user.username }));
      embed.setColor('#f276f3');
      embed.setFooter(ctx.locale('commands:avatar.footer', { user: user.username }));
    }
    await ctx.makeMessage({ embeds: [embed] });
  }
}
