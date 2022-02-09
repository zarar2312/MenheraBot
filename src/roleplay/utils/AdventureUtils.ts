import {
  BackPackItem,
  EnemyDrops,
  HolyBlessings,
  LeveledItem,
  ReadyToBattleEnemy,
  RoleplayUserSchema,
  UserCooldown,
} from '@roleplay/Types';
import InteractionCommandContext from '@structures/command/InteractionContext';
import { LEVEL_UP_BLESSES } from '@roleplay/Constants';
import { IReturnData } from '@utils/Types';
import { moreThanAnHour, RandomFromArray } from '@utils/Util';
import { EmbedFieldData } from 'discord.js-light';
import moment from 'moment';
import { getEnemies, getItemById } from './DataUtils';
import { nextLevelXp } from './Calculations';

export const canGoToDungeon = (
  user: RoleplayUserSchema,
  ctx: InteractionCommandContext,
): { canGo: boolean; reason: EmbedFieldData[] } => {
  let canGo = true;
  const reason: EmbedFieldData[] = [];

  user.cooldowns.forEach((cd) => {
    if (cd?.data === 'DEATH') {
      canGo = false;
      reason.push({
        name: ctx.locale('roleplay:cooldowns.death'),
        value: ctx.locale('roleplay:cooldowns.death-description'),
      });
      return;
    }
    if (cd.until > Date.now()) {
      if (cd.reason === 'church' && cd.data === 'COOLDOWN') return;
      canGo = false;
      reason.push({
        name: ctx.locale(
          `roleplay:cooldowns.${cd?.data === 'DEATH' ? 'death' : (cd.reason as 'death')}`,
        ),
        value: ctx.locale(
          `roleplay:cooldowns.${
            cd?.data === 'DEATH' ? 'death' : (cd.reason as 'death')
          }-description`,
          {
            time: moment
              .utc(cd.until - Date.now())
              .format(moreThanAnHour(cd.until - Date.now()) ? 'HH:mm:ss' : 'mm:ss'),
            subtime: ctx.locale(
              `common:${moreThanAnHour(cd.until - Date.now()) ? 'hours' : 'minutes'}`,
            ),
          },
        ),
      });
    }
  });

  return { canGo, reason };
};

export const getDungeonEnemy = (dungeonLevel: number, userLevel: number): ReadyToBattleEnemy => {
  const availableEnemies = getEnemies().filter((a) => a.data.dungeonLevels.includes(dungeonLevel));

  const enemy = RandomFromArray(availableEnemies);

  const enemyPhase = dungeonLevel - 1 + Math.floor(userLevel / 4);

  const enemyData: ReadyToBattleEnemy = {
    id: enemy.id,
    life: Math.floor(enemy.data.baseLife + enemy.data.statsPerPhase.baseLife * enemyPhase),
    armor: Math.floor(enemy.data.baseArmor + enemy.data.statsPerPhase.baseArmor * enemyPhase),
    damage: Math.floor(enemy.data.baseDamage + enemy.data.statsPerPhase.baseDamage * enemyPhase),
    experience: Math.floor(
      enemy.data.experience + enemy.data.statsPerPhase.experience * enemyPhase,
    ),
    agility: Math.floor(enemy.data.baseAgility + enemy.data.statsPerPhase.baseAgility * enemyPhase),
    level: Math.floor(enemyPhase * 5),
    loots: enemy.data.loots,
  };

  return enemyData;
};

export const isDead = (entity: unknown & { life: number }): boolean => entity.life <= 0;

export const isInventoryFull = (user: RoleplayUserSchema): boolean => {
  const userBackPack = getItemById<BackPackItem>(user.backpack.id);

  if (
    user.inventory.reduce((p, c) => p + c.amount, 0) >=
    userBackPack.data.capacity + userBackPack.data.perLevel * user.backpack.level
  )
    return true;
  return false;
};

export const getFreeInventorySpace = (user: RoleplayUserSchema): number => {
  const userBackPack = getItemById(user.backpack.id) as IReturnData<BackPackItem>;

  const usedSpace = user.inventory.reduce((p, c) => p + c.amount, 0);

  return Math.floor(
    userBackPack.data.capacity + userBackPack.data.perLevel * user.backpack.level - usedSpace,
  );
};

export const addToInventory = (
  items: LeveledItem[],
  inventory: RoleplayUserSchema['inventory'],
): RoleplayUserSchema['inventory'] => {
  items.forEach((a) => {
    const inInventory = inventory.find((b) => b.id === a.id && b.level === a.level);
    if (inInventory) inInventory.amount += 1;
    else inventory.push({ amount: 1, ...a });
  });

  return inventory;
};

export const removeFromInventory = (
  items: LeveledItem[],
  inventory: RoleplayUserSchema['inventory'],
): RoleplayUserSchema['inventory'] => {
  items.forEach((a) => {
    const inInventory = inventory.find((b) => b.id === a.id && b.level === a.level);
    if (inInventory) {
      inInventory.amount -= 1;
      if (inInventory.amount <= 0)
        inventory.splice(
          inventory.findIndex((b) => b.id === a.id && b.level === a.level),
          1,
        );
    }
  });

  return inventory;
};

export const makeCooldown = (
  cooldowns: UserCooldown[],
  newCooldown: UserCooldown,
): RoleplayUserSchema['cooldowns'] => {
  const finded = cooldowns.find((a) => a.reason === newCooldown.reason);

  if (finded) {
    finded.until = newCooldown.until;
    if (newCooldown.data) finded.data = newCooldown.data;
  } else cooldowns.push(newCooldown);
  return cooldowns;
};

export const getEnemyLoot = (loots: EnemyDrops[]): EnemyDrops['loots'] => {
  const chance = Math.floor(Math.random() * 100);

  let accumulator = loots.reduce((p, c) => p + c.probability, 0);

  const mapedChanges: { loots: LeveledItem[]; probabilities: number[] }[] = loots.map((a) => {
    const toReturn = [accumulator - a.probability, accumulator];
    accumulator -= a.probability;
    return { loots: a.loots, probabilities: toReturn };
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const data of mapedChanges) {
    const [min, max] = data.probabilities;
    if (chance >= min && chance <= max) {
      return data.loots;
    }
  }
  return [];
};

export const makeLevelUp = (
  user: RoleplayUserSchema,
): { level: number; holyBlessings: HolyBlessings } => {
  if (user.experience >= nextLevelXp(user.level)) {
    user.holyBlessings.ability += LEVEL_UP_BLESSES[user.level].ability;
    user.holyBlessings.battle += LEVEL_UP_BLESSES[user.level].battle;
    user.holyBlessings.vitality += LEVEL_UP_BLESSES[user.level].vitality;
    user.level += 1;
    user.experience = 0;
  }

  return { level: user.level, holyBlessings: user.holyBlessings };
};
