/* eslint-disable no-restricted-syntax */
import MagicItems from '@data/HuntMagicItems';
import {
  CollectorFilter,
  MessageComponentInteraction,
  MessageButton,
  MessageSelectMenu,
  MessageActionRow,
  MessageActionRowComponentResolvable,
  TextBasedChannels,
} from 'discord.js-light';
import { IReturnData, TMagicItemsFile } from '@utils/Types';

export default class Util {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static async collectComponentInteractionWithId<T extends MessageComponentInteraction>(
    channel: TextBasedChannels,
    authorID: string,
    customId: string,
    time?: number,
  ): Promise<null | T>;

  static async collectComponentInteractionWithId(
    channel: TextBasedChannels,
    authorID: string,
    customId: string,
    time = 7000,
  ): Promise<null | MessageComponentInteraction> {
    return channel
      .awaitMessageComponent({
        filter: (m) => m.user.id === authorID && m.customId === customId,
        time,
      })
      .then((interaction) => {
        interaction.deferUpdate().catch(() => null);
        return interaction;
      })
      .catch(() => null);
  }

  static async collectComponentInteractionWithCustomFilter<T extends MessageComponentInteraction>(
    channel: TextBasedChannels,
    filter: CollectorFilter<[T]>,
    time?: number,
  ): Promise<null | T>;

  static async collectComponentInteractionWithCustomFilter(
    channel: TextBasedChannels,
    filter: CollectorFilter<[MessageComponentInteraction]>,
    time = 7000,
  ): Promise<null | MessageComponentInteraction> {
    return channel
      .awaitMessageComponent({ filter, time })
      .then((interaction) => {
        interaction.deferUpdate().catch(() => null);
        return interaction;
      })
      .catch(() => null);
  }

  static async collectComponentInteraction<T extends MessageComponentInteraction>(
    channel: TextBasedChannels,
    authorID: string,
    time?: number,
  ): Promise<null | T>;

  static async collectComponentInteraction(
    channel: TextBasedChannels,
    authorID: string,
    time = 7000,
  ): Promise<null | MessageComponentInteraction> {
    return channel
      .awaitMessageComponent({ filter: (m) => m.user.id === authorID, time })
      .then((interaction) => {
        interaction.deferUpdate().catch(() => null);
        return interaction;
      })
      .catch(() => null);
  }

  static async collectComponentInteractionWithStartingId<T extends MessageComponentInteraction>(
    channel: TextBasedChannels,
    authorID: string,
    customId: string,
    time?: number,
  ): Promise<null | T>;

  static async collectComponentInteractionWithStartingId(
    channel: TextBasedChannels,
    authorID: string,
    customId: string,
    time = 7000,
  ): Promise<null | MessageComponentInteraction> {
    return channel
      .awaitMessageComponent({
        filter: (m) => m.user.id === authorID && m.customId.startsWith(customId),
        time,
      })
      .then((interaction) => {
        interaction.deferUpdate();
        return interaction;
      })
      .catch(() => null);
  }
}

export const resolveCustomId = (customId: string): string =>
  customId
    .replace(/^[\s\d]+/, '')
    .replace('|', '')
    .trim();

export const resolveSeparatedStrings = (string: string): string[] => string.split(' | ');

export const disableComponents = <T extends MessageButton | MessageSelectMenu>(
  label: string,
  components: T[],
): T[] =>
  components.map((c) => {
    c.setDisabled(true);
    if (c instanceof MessageSelectMenu) c.setPlaceholder(label);
    else c.setLabel(label);
    return c;
  });

export const actionRow = (components: MessageActionRowComponentResolvable[]): MessageActionRow =>
  new MessageActionRow({ components });

export const getMagicItemById = <T extends TMagicItemsFile = TMagicItemsFile>(
  id: number,
): IReturnData<T> =>
  Object.entries(MagicItems)
    .filter((a) => Number(a[0]) === id)
    .map((a) => ({ id: Number(a[0]), data: a[1] }))[0];

export const getMagicItemByCustomFilter = (
  filter: (item: [string, TMagicItemsFile]) => boolean,
): IReturnData<TMagicItemsFile> =>
  Object.entries(MagicItems)
    .filter(filter)
    .map((a) => ({ id: Number(a[0]), data: a[1] }))[0];

export const getMillisecondsToTheEndOfDay = (): number => {
  const date = new Date();
  const passedMilli =
    date.getHours() * 3600000 +
    date.getMinutes() * 60000 +
    date.getSeconds() * 1000 +
    date.getMilliseconds();

  return 86400000 - passedMilli;
};

export const debugError = (err: Error): null => {
  if (process.env.NODE_ENV === 'development') console.error(err.message);
  return null;
};

export const negate = (value: number): number => value * -1;

// eslint-disable-next-line no-control-regex
export const toWritableUTF = (str: string): string => str.replace(/[^\x00-\xFF]/g, '');
