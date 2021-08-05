import Command from '@structures/Command';
import MenheraClient from 'MenheraClient';
import CommandContext from '@structures/CommandContext';

export default class RegisterCommand extends Command {
  constructor(client: MenheraClient) {
    super(client, {
      name: 'register',
      aliases: ['registrar'],
      cooldown: 5,
      clientPermissions: ['EMBED_LINKS'],
      category: 'rpg',
    });
  }

  async run(ctx: CommandContext): Promise<void> {
    console.log(ctx.data.user.votos);
  }
}