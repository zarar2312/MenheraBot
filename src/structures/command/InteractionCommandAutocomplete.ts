import { Abilities } from '@roleplay/data';
import { ApplicationCommandOptionChoice, AutocompleteInteraction } from 'discord.js-light';
import i18next from 'i18next';
import { findBestMatch } from 'string-similarity';

const availableAbilities: { name: string; id: number }[] = [];
const allNames: string[] = [];

const populateTranslations = () => {
  const toPortuguese = i18next.getFixedT('pt-BR');
  const toEnglish = i18next.getFixedT('en-US');

  Object.keys(Abilities).forEach((id) => {
    allNames.push(toPortuguese(`abilities:${id}.name`));
    availableAbilities.push({
      name: toPortuguese(`abilities:${id}.name`),
      id: Number(id),
    });

    allNames.push(toEnglish(`abilities:${id}.name`));
    availableAbilities.push({
      name: toEnglish(`abilities:${id}.name`),
      id: Number(id),
    });
  });
};

const ExecuteAutocompleteInteractions = async (
  interaction: AutocompleteInteraction,
): Promise<void> => {
  if (availableAbilities.length === 0) populateTranslations();
  if (interaction.commandName !== 'centro') return;
  const texted = interaction.options.getInteger('id');

  if (Date.now() - interaction.createdTimestamp >= 3000) return;

  if (`${texted}`.length < 5) return interaction.respond([]);

  const ratings = findBestMatch(`${texted}`, allNames);

  const toSendOptions = ratings.ratings.filter((a) => a.rating >= 0.35);
  if (toSendOptions.length === 0) return interaction.respond([]);

  const abilities: ApplicationCommandOptionChoice[] = [];

  toSendOptions.forEach((a) => {
    if (abilities.length >= 25) return;
    const ability = availableAbilities.find((b) => b.name === a.target);
    if (!ability) return;
    const toPush = { name: ability.name, value: ability.id };
    if (abilities.some((b) => b.value === toPush.value)) return;
    abilities.push(toPush);
  });

  if (abilities.length > 0) interaction.respond(abilities);
};

export default ExecuteAutocompleteInteractions;
