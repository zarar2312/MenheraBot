/* eslint-disable import/named */
import { Collection, Message, MessageEmbed } from 'discord.js';

import i18next, { TFunction } from 'i18next';

import MenheraClient from 'MenheraClient';
import { IAfkUserData, ICommandUsedData, IUserSchema } from '@utils/Types';
import http from '@utils/HTTPrequests';
import CommandContext from '@structures/command/CommandContext';
import Event from '@structures/Event';

export default class MessageReceive extends Event {
  private warnedUserCooldowns: Map<string, boolean> = new Map();

  constructor(public client: MenheraClient) {
    super(client);
  }

  async notifyAfk(message: Message, t: TFunction, userIds: Array<string>): Promise<void> {
    const afkUsers = await this.client.repositories.userRepository.findAfkByIDs(userIds);

    if (!afkUsers) return;

    afkUsers.map(async (data: IUserSchema) => {
      if (data.id === message.author.id) return;
      const userFetched = await this.client.users.fetch(data.id).catch();
      await message.channel.send(
        `<:notify:759607330597502976> | ${t('commands:afk.reason', {
          tag: userFetched.tag,
          reason: data.afkReason,
        })}`,
      );
    });
  }

  async resolveAfk(message: Message, t: TFunction, afkData: IAfkUserData): Promise<void> {
    if (message.channel.type === 'DM') return;
    if (!message.guild) return;
    if (!this.client.user) return;
    await this.client.repositories.cacheRepository.updateAfk(message.author.id, {
      afk: false,
      afkReason: null,
      afkGuild: null,
    });
    if (!message.guild) return;
    const member = await message.channel.guild.members.fetch(message.author.id);

    const guildAfkId = afkData?.afkGuild;

    try {
      if (guildAfkId && message.guild.id !== guildAfkId) {
        const afkGuild = await this.client.guilds.fetch(guildAfkId).catch();
        const guildMember = await afkGuild?.members.fetch(message.author.id).catch();
        await afkGuild?.members.fetch(this.client.user.id).catch();
        if (guildMember?.manageable && guildMember?.nickname)
          if (guildMember.nickname.slice(0, 5) === '[AFK]')
            guildMember.setNickname(guildMember.nickname.substring(5), 'AFK System');
      } else if (member.manageable && member.nickname)
        if (member.nickname.slice(0, 5) === '[AFK]')
          member.setNickname(member.nickname.substring(5), 'AFK System');
    } catch {
      // owo
    }

    message.channel
      .send(
        `<:MenheraWink:767210250637279252> | ${t('commands:afk.back')}, ${message.author} >...<`,
      )
      .then((msg) => {
        if (msg.deletable) {
          setTimeout(() => {
            msg.delete();
          }, 5000);
        }
      });
  }

  async run(message: Message): Promise<void> {
    if (message.author.bot) return;
    if (message.channel.type === 'DM') return;
    if (!message.guild) return;
    if (!this.client.user) return;
    if (message.guild.me && !message.channel.permissionsFor(message.guild.me)?.has('SEND_MESSAGES'))
      return;

    const server = await this.client.repositories.cacheRepository.fetchGuild(message.guild.id);
    let prefix = server.prefix.toLowerCase() ?? process.env.BOT_PREFIX;
    const language = server.lang ?? 'pt-BR';
    const t = i18next.getFixedT(language);

    if (message.mentions.users.size > 0)
      await this.notifyAfk(
        message,
        t,
        message.mentions.users.map((u) => u.id),
      );

    const afkData = await this.client.repositories.cacheRepository.fetchAfk(message.author.id);

    if (afkData && afkData.afk) this.resolveAfk(message, t, afkData);

    if (process.env.NODE_ENV === 'development') prefix = process.env.BOT_PREFIX as string;

    if (
      message.content.startsWith(`<@!${this.client.user.id}>`) ||
      message.content.startsWith(`<@${this.client.user.id}>`)
    ) {
      await message.channel.send(
        `<:MenheraWink:767210250637279252> | ${t('events:mention.start')} ${message.author}, ${t(
          'events:mention.end',
          { prefix },
        )}`,
      );
      return;
    }

    if (!message.content.toLowerCase().startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift()?.toLowerCase();

    if (!cmd) return;

    const command =
      this.client.commands.get(cmd) ||
      this.client.commands.get(this.client.aliases.get(cmd) as string);
    if (!command) return;

    const dbCommand = await this.client.repositories.cacheRepository.fetchCommand(
      command.config.name,
    );

    if (
      server.blockedChannels?.includes(message.channel.id) &&
      !message.member?.permissions.has('MANAGE_CHANNELS')
    ) {
      await message.channel.send(`🔒 | ${t('events:blocked-channel')}`);
      return;
    }

    const authorData = await this.client.repositories.userRepository.findOrCreate(
      message.author.id,
    );

    if (authorData?.ban) {
      await message.channel.send(
        `<:negacao:759603958317711371> | ${t('permissions:BANNED_INFO', {
          banReason: authorData?.banReason,
        })}`,
      );
      return;
    }

    if (command.config.devsOnly && process.env.OWNER !== message.author.id) {
      await message.channel.send(`${t('permissions:ONLY_DEVS')}`);
      return;
    }

    if (server.disabledCommands?.includes(command.config.name)) {
      await message.channel.send(
        `🔒 | ${t('permissions:DISABLED_COMMAND', {
          prefix: server.prefix,
          cmd: command.config.name,
        })}`,
      );
      return;
    }

    if (dbCommand?.maintenance && process.env.OWNER !== message.author.id) {
      await message.channel.send(
        `<:negacao:759603958317711371> | ${t('events:maintenance', {
          reason: dbCommand.maintenanceReason,
        })}`,
      );
      return;
    }

    if (!this.client.cooldowns.has(command.config.name))
      this.client.cooldowns.set(command.config.name, new Collection());

    if (process.env.OWNER !== message.author.id) {
      const now = Date.now();
      const timestamps = this.client.cooldowns.get(command.config.name) as Collection<
        string,
        number
      >;
      const cooldownAmount = (command.config.cooldown || 3) * 1000;

      if (timestamps.has(message.author.id)) {
        const expirationTime = (timestamps.get(message.author.id) as number) + cooldownAmount;
        const hasBeenWarned = this.warnedUserCooldowns.get(message.author.id);

        if (now < expirationTime) {
          if (hasBeenWarned) return;
          this.warnedUserCooldowns.set(message.author.id, true);
          const timeLeft = (expirationTime - now) / 1000;
          await message.channel.send(
            `<:atencao:759603958418767922> | ${t('events:cooldown', {
              time: timeLeft.toFixed(2),
              cmd: command.config.name,
            })}`,
          );
          return;
        }
      }

      timestamps.set(message.author.id, now);
      this.warnedUserCooldowns.set(message.author.id, false);
      setTimeout(() => {
        timestamps.delete(message.author.id);
        this.warnedUserCooldowns.delete(message.author.id);
      }, cooldownAmount);
    }

    if (command.config.userPermissions) {
      const missing = message.channel
        .permissionsFor(message.author)
        ?.missing(command.config.userPermissions);
      if (missing?.length) {
        const perm = missing.map((value) => t(`permissions:${value}`)).join(', ');
        await message.channel.send(
          `<:negacao:759603958317711371> | ${t('permissions:USER_MISSING_PERMISSION', { perm })}`,
        );
        return;
      }
    }
    if (command.config.clientPermissions) {
      const missing = message.channel
        .permissionsFor(this.client.user)
        ?.missing(command.config.clientPermissions);
      if (missing?.length) {
        const perm = missing.map((value) => t(`permissions:${value}`)).join(', ');
        await message.channel.send(
          `<:negacao:759603958317711371> | ${t('permissions:CLIENT_MISSING_PERMISSION', { perm })}`,
        );
        return;
      }
    }

    const isSlash = this.client.slashCommands.some((slash) => {
      if (slash.config.name === command.config.name) return true;

      if (command.config.aliases && command.config.aliases.includes(slash.config.name)) return true;
      return false;
    });

    if (isSlash) {
      if (Math.random().toFixed(1) === '0.1')
        message.channel.send(`⚠️ | ${t('permissions:SLASH_COMMAND')}`);
    }

    const ctx = new CommandContext(this.client, message, args, { user: authorData, server }, t);

    try {
      new Promise((res) => {
        if (!command.run) return;
        res(command.run(ctx));
      }).catch(async (err) => {
        const errorWebHook = await this.client.fetchWebhook(
          process.env.BUG_HOOK_ID as string,
          process.env.BUG_HOOK_TOKEN as string,
        );

        const errorMessage = err.stack.length > 1800 ? `${err.stack.slice(0, 1800)}...` : err.stack;
        const embed = new MessageEmbed();
        embed.setColor('#fd0000');
        embed.setTitle(t('events:error_embed.title', { cmd: command.config.name }));
        embed.setDescription(`\`\`\`js\n${errorMessage}\`\`\``);
        embed.addField(
          '<:atencao:759603958418767922> | Usage',
          `UserId: \`${message.author.id}\` \nServerId: \`${message.guild?.id ?? 'NO GUILD'}\``,
        );
        embed.setTimestamp();
        embed.addField(t('events:error_embed.report_title'), t('events:error_embed.report_value'));

        message.channel
          .send({ embeds: [embed] })
          .catch(() => message.channel.send(`${t('events:error_embed.error_msg')}`));
        if (this.client.user?.id === '708014856711962654')
          errorWebHook.send({ embeds: [embed] }).catch();
      });
    } catch (err) {
      const errorWebHook = await this.client.fetchWebhook(
        process.env.BUG_HOOK_ID as string,
        process.env.BUG_HOOK_TOKEN as string,
      );

      const errorMessage = err.stack.length > 1800 ? `${err.stack.slice(0, 1800)}...` : err.stack;
      const embed = new MessageEmbed();
      embed.setColor('#fd0000');
      embed.setTitle(t('events:error_embed.title', { cmd: command.config.name }));
      embed.setDescription(`\`\`\`js\n${errorMessage}\`\`\``);
      embed.addField(
        '<:atencao:759603958418767922> | Usage',
        `UserId: \`${message.author.id}\` \nServerId: \`${message.guild.id}\``,
      );
      embed.setTimestamp();
      embed.addField(t('events:error_embed.report_title'), t('events:error_embed.report_value'));

      message.channel
        .send({ embeds: [embed] })
        .catch(() => message.channel.send(`${t('events:error_embed.error_msg')}`));
      if (this.client.user.id === '708014856711962654')
        errorWebHook.send({ embeds: [embed] }).catch();
      console.error(err.stack);
    }

    const toSend: ICommandUsedData = {
      authorId: message.author.id,
      guildId: message.guild.id,
      commandName: command.config.name,
      data: Date.now(),
      args: args.join(' '),
    };
    await http.postCommand(toSend);
  }
}
