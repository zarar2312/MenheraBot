// import utc from 'dayjs/plugin/utc';
import dayjs from 'dayjs';
import { ActionRow, ButtonStyles, DiscordEmbedField } from 'discordeno/types';
/*
    time: dayjs
            .extend(utc)
            .add(cooldown, 'ms')
            .utc()
            .format(moreThanAnHour(cooldown) ? 'HH:mm:ss' : 'mm:ss'),
            */

import { bot } from '../../index';
import { createActionRow, createButton } from '../../utils/discord/componentUtils';
import { createEmbed, hexStringToNumber } from '../../utils/discord/embedUtils';
import { createCommand } from '../../structures/command/createCommand';

const CooldownsCommand = createCommand({
  path: '',
  name: 'cooldowns',
  description: '「⌛」・Mostra todos os seus tempos de recarga',
  descriptionLocalizations: { 'en-US': '「⌛」・Shows all your cooldowns' },
  category: 'info',
  authorDataFields: ['huntCooldown', 'voteCooldown', 'selectedColor'],
  execute: async (ctx, finishCommand) => {
    const canDo = (value: number): boolean => value <= 0;
    const moreThanAnHour = (time: number): boolean => time >= 3600000;

    const createField = (type: string, cooldown: number): DiscordEmbedField => ({
      name: ctx.locale(`commands:cooldowns.${type as 'vote'}`),
      value: ctx.locale(
        canDo(cooldown) ? 'commands:cooldowns.no-cooldown' : 'commands:cooldowns.time',
        {
          time: dayjs(cooldown).format(moreThanAnHour(cooldown) ? 'HH:mm:ss' : 'mm:ss'),
          subtime: ctx.locale(moreThanAnHour(cooldown) ? 'common:hours' : 'common:minutes'),
          unix: Math.floor((cooldown + Date.now()) / 1000),
        },
      ),
      inline: false,
    });

    const huntCooldown = ctx.authorData.huntCooldown - Date.now();
    const voteCooldown = ctx.authorData.voteCooldown - Date.now();

    const embed = createEmbed({
      title: ctx.locale('commands:cooldowns.title'),
      color: hexStringToNumber(ctx.authorData.selectedColor),
      fields: [createField('vote', voteCooldown), createField('hunt', huntCooldown)],
    });

    const components: ActionRow[] = [];

    if (voteCooldown < 0)
      components.push(
        createActionRow([
          createButton({
            style: ButtonStyles.Link,
            url: `https://top.gg/bot/${bot.applicationId}/vote`,
            label: ctx.locale('commands:cooldowns.click-to-vote'),
          }),
        ]),
      );

    ctx.makeMessage({ embeds: [embed], components });
    finishCommand();
  },
});

export default CooldownsCommand;
