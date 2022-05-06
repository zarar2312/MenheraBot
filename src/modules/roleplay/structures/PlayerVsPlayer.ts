import { PVP_USER_RESPONSE_TIME_LIMIT } from '@roleplay/Constants';
import { BattleUserTurn, UserBattleEntity } from '@roleplay/Types';
import InteractionCommandContext from '@structures/command/InteractionContext';
import { COLORS, emojis, EmojiTypes } from '@structures/Constants';
import Util, { actionRow, capitalize, makeCustomId, resolveSeparatedStrings } from '@utils/Util';
import { MessageEmbed, MessageSelectMenu, SelectMenuInteraction, User } from 'discord.js-light';
import { getAbilityDamageFromEffects, invertBattleTurn, isDead } from '../utils/AdventureUtils';
import {
  calculateAttackSuccess,
  calculateDodge,
  calculateEffectiveDamage,
  calculateHeal,
  calculatePoison,
  calculateUserPenetration,
  didUserHit,
  getAbilityCost,
  getUserAgility,
  getUserArmor,
  getUserDamage,
  getUserIntelligence,
  getUserMaxLife,
} from '../utils/Calculations';
import { getAbilityById, getClassById } from '../utils/DataUtils';

interface PvpUserInfoStructure {
  missedAttacks: number;
  didRunaway: boolean;
}

export default class PlayerVsPlayer {
  public attackerInfo: PvpUserInfoStructure = {
    didRunaway: false,
    missedAttacks: 0,
  };

  public defenderInfo: PvpUserInfoStructure = {
    didRunaway: false,
    missedAttacks: 0,
  };

  constructor(
    private ctx: InteractionCommandContext,
    public attacker: UserBattleEntity,
    public defender: UserBattleEntity,
    public attackerDiscordUser: User,
    public defenderDiscordUser: User,
    public lastText: string,
  ) {}

  public async battleLoop(): Promise<PlayerVsPlayer> {
    const whoWillStart =
      getUserAgility(this.defender) > getUserAgility(this.attacker) ? 'defender' : 'attacker';

    const needStop = await this.userAttack(whoWillStart);

    if (!needStop) {
      const nextStop = await this.userAttack(invertBattleTurn(whoWillStart));
      this.clearEffects();
      if (!nextStop) return this.battleLoop();
    }

    return this;
  }

  private clearEffects(): void {
    (['attacker', 'defender'] as const).forEach((toEffect) => {
      this[toEffect].effects.forEach((a) => {
        if (a.effectType === 'heal') {
          this[toEffect].life = Math.min(
            getUserMaxLife(this[toEffect]),
            this[toEffect].life + calculateHeal(this[toEffect], a),
          );
        }

        if (a.effectType === 'poison') {
          this[toEffect].life -= calculateEffectiveDamage(
            calculatePoison(a, this[toEffect].life),
            0,
            getUserArmor(this[invertBattleTurn(toEffect)]),
          );
        }

        a.durationInTurns -= 1;
        if (a.durationInTurns <= 0)
          this[toEffect].effects.splice(
            this[toEffect].effects.findIndex((b) => a === b),
            1,
          );
      });
    });
  }

  private static getEffectsDisplayText(
    effects: UserBattleEntity['effects'],
    wanned: 'buff' | 'debuff',
  ): string {
    const toUseEffects = effects.reduce<UserBattleEntity['effects']>((p, c) => {
      if (
        c.effectType.endsWith(`_${wanned}`) ||
        c.effectType === (wanned === 'buff' ? 'heal' : 'poison')
      ) {
        const found = p.find((a) => a.effectType === c.effectType);

        if (found) {
          found.durationInTurns = Math.max(c.durationInTurns, found.durationInTurns);
        } else p.push(c);
      }
      return p;
    }, []);

    if (toUseEffects.length === 0) return '';

    return `${emojis[wanned]} | ${capitalize(wanned)}s: ${toUseEffects
      .map((a) => `**${a.durationInTurns}**${emojis[a.effectType.split('_')[0] as EmojiTypes]}`)
      .join('  ')}\n`;
  }

  private async userAttack(user: BattleUserTurn): Promise<boolean> {
    const toAttack = this[user];
    const toDefend = this[invertBattleTurn(user)];
    const toAttackUser = this[`${user}DiscordUser`];
    const toDefendUser = this[`${invertBattleTurn(user)}DiscordUser`];

    if (isDead(toDefend)) {
      this.lastText = this.ctx.locale('roleplay:pvp.pvp-finished', {
        winner: toAttackUser.username,
        loser: toDefendUser.username,
        reason: this.ctx.locale('roleplay:pvp.reasons.user-death'),
      });
      return true;
    }

    if (isDead(toAttack)) {
      this.lastText = this.ctx.locale('roleplay:pvp.pvp-finished', {
        loser: toAttackUser.username,
        winner: toDefendUser.username,
        reason: this.ctx.locale('roleplay:pvp.reasons.user-death'),
      });
      return true;
    }

    if (this[`${user}Info`].missedAttacks >= 4) {
      this[user].life = 0;
      this.lastText = this.ctx.locale('roleplay:pvp.pvp-finished', {
        winner: toDefendUser.username,
        loser: toAttackUser.username,
        reason: this.ctx.locale('roleplay:pvp.reasons.miss-attack'),
      });
      return true;
    }

    const attackerDamage = getUserDamage(toAttack);
    const attackerArmor = getUserArmor(toAttack);
    const attackerAgility = getUserAgility(toAttack);
    const attackerIntelligence = getUserIntelligence(toAttack);
    const attackerPenetration = calculateUserPenetration(toAttack);

    const defenderDamage = getUserDamage(toDefend);
    const defenderArmor = getUserArmor(toDefend);
    const defenderAgility = getUserAgility(toDefend);
    const defenderIntelligence = getUserAgility(toDefend);
    const defenderDodge = calculateDodge(defenderAgility, attackerAgility);
    const defenderAttackSuccess = calculateAttackSuccess(defenderAgility, attackerAgility);

    const attackerDodge = calculateDodge(attackerAgility, defenderAgility);
    const attackerAttackSuccess = calculateAttackSuccess(attackerAgility, defenderAgility);

    const baseFields = [
      {
        name: this.ctx.locale('roleplay:pvp.user-stats', { user: toAttackUser.username }),
        value: `${this.ctx.locale('roleplay:pvp.user-stats-info', {
          life: toAttack.life,
          mana: toAttack.mana,
          damage: attackerDamage,
          armor: attackerArmor,
          intelligence: attackerIntelligence,
          agility: attackerAgility,
          chanceToConnect: (100 - attackerAttackSuccess).toFixed(2),
          chanceToDodge: attackerDodge.toFixed(2),
        })}\n${PlayerVsPlayer.getEffectsDisplayText(
          toAttack.effects,
          'buff',
        )}${PlayerVsPlayer.getEffectsDisplayText(toAttack.effects, 'debuff')}`,
        inline: true,
      },
      {
        name: this.ctx.locale('roleplay:pvp.user-stats', { user: toDefendUser.username }),
        value: `${this.ctx.locale('roleplay:pvp.user-stats-info', {
          life: toDefend.life,
          mana: toDefend.mana,
          damage: defenderDamage,
          armor: defenderArmor,
          intelligence: defenderIntelligence,
          agility: defenderAgility,
          chanceToConnect: (100 - defenderAttackSuccess).toFixed(2),
          chanceToDodge: defenderDodge.toFixed(2),
        })}\n${PlayerVsPlayer.getEffectsDisplayText(
          toDefend.effects,
          'buff',
        )}${PlayerVsPlayer.getEffectsDisplayText(toDefend.effects, 'debuff')}`,
        inline: true,
      },
    ];

    if (toAttackUser.id !== this.attackerDiscordUser.id) baseFields.reverse();

    const embed = new MessageEmbed()
      .setTitle(
        this.ctx.prettyResponse('sword', 'roleplay:pvp.title', {
          user: toAttackUser.username,
        }),
      )
      .setColor(COLORS.Battle)
      .setFooter({
        text: this.ctx.locale('roleplay:battle.footer', {
          time: PVP_USER_RESPONSE_TIME_LIMIT / 1000,
        }),
      })
      .setDescription(this.lastText)
      .addFields([
        ...baseFields,
        {
          name: this.ctx.locale('roleplay:battle.options.available'),
          value: '\u200b',
          inline: false,
        },
      ]);

    const [selectCustomId, battleId] = makeCustomId('SELECT');

    const options = new MessageSelectMenu()
      .setCustomId(selectCustomId)
      .setPlaceholder(this.ctx.locale('roleplay:battle.select'))
      .addOptions(
        {
          label: this.ctx.locale('roleplay:battle.options.hand-attack'),
          value: 'HANDATTACK',
          description: this.ctx
            .locale('roleplay:battle.options.hand-attack-description')
            .substring(0, 100),
        },
        {
          label: this.ctx.locale('roleplay:battle.options.giveup'),
          value: 'GIVEUP',
          description: this.ctx
            .locale('roleplay:battle.options.giveup-description')
            .substring(0, 100),
        },
      );

    embed.addFields([
      {
        name: this.ctx.locale('roleplay:battle.options.hand-attack'),
        value: this.ctx.locale('roleplay:battle.options.attack-info', {
          damage: attackerDamage,
          chanceToConnect: (100 - attackerAttackSuccess).toFixed(2),
        }),
        inline: true,
      },
    ]);

    toAttack.abilities.forEach((ability) => {
      const abilityName = this.ctx.locale(`abilities:${ability.id as 100}.name`);
      const abilityCost = getAbilityCost(ability);
      const canUseAbility = toAttack.mana >= abilityCost;

      embed.addField(
        abilityName,
        this.ctx.locale('roleplay:battle.options.ability-info', {
          damage: getAbilityDamageFromEffects(
            getAbilityById(ability.id).data.effects,
            attackerIntelligence,
            ability.level,
          ),
          cost: abilityCost,
          'no-mana': !canUseAbility ? this.ctx.locale('roleplay:battle.no-mana') : '',
        }),
        true,
      );

      if (canUseAbility) {
        options.addOptions({
          label: abilityName,
          description: this.ctx
            .locale(`abilities:${ability.id as 100}.description`)
            .substring(0, 100),
          value: `ABILITY | ${ability.id}`,
        });
      }
    });

    this.ctx.makeMessage({ embeds: [embed], components: [actionRow([options])] });

    const selectedOptions =
      await Util.collectComponentInteractionWithStartingId<SelectMenuInteraction>(
        this.ctx.channel,
        toAttackUser.id,
        battleId,
        PVP_USER_RESPONSE_TIME_LIMIT,
      );

    if (!selectedOptions) {
      this[`${user}Info`].missedAttacks += 1;
      this.lastText = this.ctx.locale('roleplay:pvp.user-no-action', {
        user: toAttackUser.username,
      });
      return false;
    }

    switch (resolveSeparatedStrings(selectedOptions.values[0])[0]) {
      case 'GIVEUP': {
        toAttack.life = 0;

        this.lastText = this.ctx.locale('roleplay:pvp.pvp-finished', {
          winner: toDefendUser.username,
          loser: toAttackUser.username,
          reason: this.ctx.locale('roleplay:pvp.reasons.user-giveup'),
        });
        return true;
      }

      case 'HANDATTACK': {
        const damageDealt = calculateEffectiveDamage(
          attackerDamage,
          attackerPenetration,
          defenderArmor,
        );
        const didConnect = didUserHit(attackerAttackSuccess);

        if (didConnect) toDefend.life -= damageDealt;

        if (isDead(toDefend)) {
          this.lastText = this.ctx.locale('roleplay:pvp.pvp-finished', {
            winner: toAttackUser.username,
            loser: toDefendUser.username,
            reason: this.ctx.locale('roleplay:pvp.reasons.user-death'),
          });
          return true;
        }
        this.lastText = this.ctx.locale('roleplay:pvp.attack-text', {
          attacker: toAttackUser.username,
          defender: toDefendUser.username,
          attack: this.ctx.locale(`roleplay:battle.options.hand-attack`),
          damage: didConnect ? damageDealt : this.ctx.locale('roleplay:pvp.miss-attack'),
        });
        return false;
      }

      case 'ABILITY': {
        const abilityId = Number(resolveSeparatedStrings(selectedOptions.values[0])[1]);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const usedAbility = this[user].abilities.find((a) => a.id === abilityId)!;
        const parsedAbility = getAbilityById(usedAbility.id);

        const didConnect = didUserHit(attackerAttackSuccess);
        let damageDealt = 0;

        parsedAbility.data.effects.forEach((a) => {
          if (a.effectType === 'damage') {
            const abilityDamage = Math.floor(
              a.effectValue +
                attackerIntelligence * (a.effectValueByIntelligence / 100) +
                a.effectValuePerLevel * usedAbility.level,
            );

            damageDealt = abilityDamage;

            if (didConnect)
              toDefend.life -= calculateEffectiveDamage(abilityDamage, 0, defenderArmor);
          } else if (a.effectType === 'heal' && a.durationInTurns === -1) {
            toAttack.life = Math.min(
              getUserMaxLife(toAttack),
              toAttack.life +
                calculateHeal(toAttack, {
                  ...a,
                  level: usedAbility.level,
                  author: {
                    totalIntelligence: attackerIntelligence,
                    elementSinergy: getClassById(toAttack.class).data.elementSinergy,
                  },
                }),
            );
          } else if (a.target === 'self')
            toAttack.effects.push({
              ...a,
              level: usedAbility.level,
              author: {
                totalIntelligence: attackerIntelligence,
                elementSinergy: getClassById(toAttack.class).data.elementSinergy,
              },
            });
          else if (a.target === 'enemy')
            toDefend.effects.push({
              ...a,
              level: usedAbility.level,
              author: {
                totalIntelligence: attackerIntelligence,
                elementSinergy: getClassById(toAttack.class).data.elementSinergy,
              },
            });
        });

        toAttack.mana -= getAbilityCost(usedAbility);

        if (isDead(toDefend)) {
          this.lastText = this.ctx.locale('roleplay:pvp.pvp-finished', {
            winner: toAttackUser.username,
            loser: toDefendUser.username,
            reason: this.ctx.locale('roleplay:pvp.reasons.user-death'),
          });
          return true;
        }
        this.lastText = this.ctx.locale('roleplay:pvp.attack-text', {
          attacker: toAttackUser.username,
          defender: toDefendUser.username,
          attack: this.ctx.locale(
            `abilities:${resolveSeparatedStrings(selectedOptions.values[0])[1] as '100'}.name`,
          ),
          damage: didConnect ? damageDealt : this.ctx.locale('roleplay:pvp.miss-attack'),
        });
        return false;
      }
    }
    this.lastText = this.ctx.locale('roleplay:pvp.user-no-action', { user: toAttackUser.username });
    return false;
  }
}