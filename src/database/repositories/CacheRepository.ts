/* eslint-disable no-shadow */
import { ICmdSchema, IGuildSchema } from '@utils/Types';
import { debugError } from '@utils/Util';
import { Redis } from 'ioredis';
import { Document } from 'mongoose';
import CmdRepository from './CmdsRepository';
import GuildsRepository from './GuildsRepository';

export default class CacheRepository {
  constructor(
    private redisClient: Redis | null,
    private guildRepository: GuildsRepository,
    private cmdRepository: CmdRepository,
  ) {}

  async fetchCommand(commandName: string): Promise<ICmdSchema | (ICmdSchema & Document) | null> {
    if (this.redisClient) {
      const commandData = await this.redisClient.get(`command:${commandName}`).catch(debugError);
      if (commandData) return JSON.parse(commandData);
    }

    const commandDataFromMongo = await this.cmdRepository.findByName(commandName);
    if (!commandDataFromMongo) return null;

    if (this.redisClient)
      await this.redisClient
        .setex(
          `command:${commandName}`,
          3600,
          JSON.stringify({
            maintenance: commandDataFromMongo.maintenance,
            maintenanceReason: commandDataFromMongo.maintenanceReason,
          }),
        )
        .catch(debugError);

    return commandDataFromMongo;
  }

  async fetchGuild(
    guildID: string,
    preferredLocale: string,
  ): Promise<IGuildSchema | (IGuildSchema & Document)> {
    if (this.redisClient) {
      const guildData = await this.redisClient.get(`guild:${guildID}`).catch(debugError);
      if (guildData) return JSON.parse(guildData);
    }

    const guildDataFromMongo = await this.guildRepository.findOrCreate(guildID, preferredLocale);

    if (this.redisClient)
      await this.redisClient
        .setex(
          `guild:${guildID}`,
          3600,
          JSON.stringify({
            lang: guildDataFromMongo.lang,
            blockedChannels: guildDataFromMongo.blockedChannels,
            disabledCommands: guildDataFromMongo.disabledCommands,
          }),
        )
        .catch(debugError);

    return guildDataFromMongo;
  }

  async updateGuild(guildID: string, update: IGuildSchema): Promise<void> {
    if (this.redisClient) {
      const stringedObject = JSON.stringify(update);
      await this.redisClient.setex(`guild:${guildID}`, 3600, stringedObject).catch(debugError);
    }
    await this.guildRepository.update(guildID, update);
  }

  async updateCommand(commandName: string, update: ICmdSchema): Promise<void> {
    if (this.redisClient) {
      const stringedObject = JSON.stringify(update);
      await this.redisClient
        .setex(`command:${commandName}`, 3600, stringedObject)
        .catch(debugError);
    }
  }

  async addDeletedAccount(user: string[] | string): Promise<void> {
    if (!this.redisClient) return;
    await this.redisClient.sadd('deleted_accounts', user).catch(debugError);
  }

  async getDeletedAccounts(): Promise<string[]> {
    if (!this.redisClient) return [];
    return this.redisClient.smembers('deleted_accounts').catch((err) => {
      debugError(err);
      return [];
    });
  }
}
