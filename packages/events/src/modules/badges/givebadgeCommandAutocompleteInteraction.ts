import { Interaction } from 'discordeno/transformers';
import { InteractionResponseTypes } from 'discordeno/types';
import { findBestMatch } from 'string-similarity';
import { bot } from '../../index';
import { getOptionFromInteraction } from '../../structures/command/getCommandOption';
import { debugError } from '../../utils/debugError';
import { profileBadges } from './profileBadges';

const executeGivebadgeAutocomplete = async (interaction: Interaction): Promise<void | null> => {
  const input = getOptionFromInteraction<number>(interaction, 'badgeid', false, true);

  const allBadges = Object.entries(profileBadges);

  const namedBadges: { id: string; name: string }[] = allBadges.map((a) => ({
    id: a[0],
    name: `[${a[0]}] - ${a[1].name}`,
  }));

  namedBadges.push(...allBadges.map((c) => ({ name: c[0], id: c[0] })));

  const ratings = findBestMatch(
    `${input}`,
    namedBadges.map((a) => a.name),
  );

  const toSendOptions = ratings.ratings.filter((a) => a.rating >= 0.2);

  if (toSendOptions.length === 0)
    return bot.helpers
      .sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
        data: {
          choices: [],
        },
      })
      .catch(debugError);

  const infoToReturn: Array<{ name: string; value: number }> = [];

  for (let i = 0; i < toSendOptions.length && i < 25; i++) {
    const { target } = toSendOptions[i];
    const badge =
      target.length < 3
        ? namedBadges.find((b) => b.name.startsWith(`[${target}`))
        : namedBadges.find((b) => b.name === target);

    if (badge) {
      const toPush = { name: badge.name, value: Number(badge.id) };
      if (!infoToReturn.some((b) => b.value === toPush.value)) infoToReturn.push(toPush);
    }
  }

  return bot.helpers
    .sendInteractionResponse(interaction.id, interaction.token, {
      type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
      data: {
        choices: infoToReturn,
      },
    })
    .catch(debugError);
};

export { executeGivebadgeAutocomplete };
