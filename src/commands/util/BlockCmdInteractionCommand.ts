import MenheraClient from 'MenheraClient';
import InteractionCommand from '@structures/command/InteractionCommand';
import InteractionCommandContext from '@structures/command/InteractionContext';

export default class BlockCmdInteractionCommand extends InteractionCommand {
  constructor(client: MenheraClient) {
    super(client, {
      name: 'blockcomando',
      description: '「🚫」・Muda as permissões de uso de comandos meus nesse servidor!',
      category: 'util',
      options: [
        {
          type: 'STRING',
          name: 'comando',
          description: 'Comando para bloquear/desbloquear',
          required: true,
        },
      ],
      cooldown: 7,
      clientPermissions: ['EMBED_LINKS'],
    });
  }

  async run(ctx: InteractionCommandContext): Promise<void> {
    const cmd = this.client.slashCommands.get(ctx.options.getString('comando', true));

    if (!cmd) {
      await ctx.replyT('error', 'commands:blockcommand.no-cmd');
      return;
    }

    if (cmd.config.devsOnly) {
      await ctx.replyT('error', 'commands:blockcommand.dev-cmd');
      return;
    }

    if (cmd.config.name === this.config.name) {
      await ctx.replyT('error', 'commands:blockcommand.foda');
      return;
    }

    if (ctx.data.server.disabledCommands?.includes(cmd.config.name)) {
      const index = ctx.data.server.disabledCommands.indexOf(cmd.config.name);

      ctx.data.server.disabledCommands.splice(index, 1);
      await this.client.repositories.cacheRepository.updateGuild(
        ctx.interaction.guild?.id as string,
        ctx.data.server,
      );
      await ctx.replyT('success', 'commands:blockcommand.unblock', { cmd: cmd.config.name });
      return;
    }
    ctx.data.server.disabledCommands.push(cmd.config.name);
    await this.client.repositories.cacheRepository.updateGuild(
      ctx.interaction.guild?.id as string,
      ctx.data.server,
    );
    await ctx.replyT('success', 'commands:blockcommand.block', { cmd: cmd.config.name });
  }
}