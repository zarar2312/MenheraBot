import Command from '@structures/Command';
import MenheraClient from 'MenheraClient';
import CommandContext from '@structures/CommandContext';

export default class DungeonCommand extends Command {
  constructor(client: MenheraClient) {
    super(client, {
      name: 'dungeon',
      cooldown: 10,
      clientPermissions: ['EMBED_LINKS'],
      category: 'rpg',
    });
  }

  async run(ctx: CommandContext): Promise<void> {
    console.log(ctx.data.user.votos);
  }
}