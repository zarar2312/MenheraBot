import { BASE_XP, DIFFICULT_TO_LEVEL_UP } from '@roleplay/Constants';
import { ProtectionItem, RoleplayUserSchema, UserAbility, WeaponItem } from '@roleplay/Types';
import { ToBLess } from '@utils/Types';
import { getAbilityById, getClassById, getItemById, getRaceById } from './DataUtils';

export const getUserMaxLife = (user: RoleplayUserSchema): number => {
  const userClass = getClassById(user.class);
  const userRace = getRaceById(user.race);
  const userBlesses = makeBlessingStatusUpgrade('life', user.blesses.maxLife);

  const classLife = userClass.data.maxLife + userClass.data.attributesPerLevel.maxLife * user.level;

  const raceLife = userRace.data.facilities.reduce(
    (p, c) => (c.facility === 'maxLife' ? p + c.boostPerLevel * user.level : 0),
    0,
  );

  return Math.floor(classLife + raceLife + userBlesses);
};

export const getUserMaxMana = (user: RoleplayUserSchema): number => {
  const userClass = getClassById(user.class);
  const userRace = getRaceById(user.race);
  const userBlesses = makeBlessingStatusUpgrade('mana', user.blesses.maxMana);

  const classMana = userClass.data.maxMana + userClass.data.attributesPerLevel.maxMana * user.level;

  const raceMana = userRace.data.facilities.reduce(
    (p, c) => (c.facility === 'maxMana' ? p + c.boostPerLevel * user.level : 0),
    0,
  );

  return Math.floor(classMana + raceMana + userBlesses);
};

export const getUserDamage = (user: RoleplayUserSchema): number => {
  const userClass = getClassById(user.class);
  const userRace = getRaceById(user.race);
  const userBlesses = makeBlessingStatusUpgrade('damage', user.blesses.damage);
  const userWeapon = getItemById<WeaponItem>(user.weapon.id);

  const classDamage =
    userClass.data.baseDamage + userClass.data.attributesPerLevel.baseDamage * user.level;

  const raceDamage = userRace.data.facilities.reduce(
    (p, c) => (c.facility === 'baseDamage' ? p + c.boostPerLevel * user.level : 0),
    0,
  );

  const weaponDamage = userWeapon.data.damage + userWeapon.data.perLevel * user.weapon.level;

  return Math.floor(classDamage + raceDamage + userBlesses + weaponDamage);
};

export const getUserArmor = (user: RoleplayUserSchema): number => {
  const userClass = getClassById(user.class);
  const userRace = getRaceById(user.race);
  const userBlesses = makeBlessingStatusUpgrade('armor', user.blesses.armor);
  const userProtection = getItemById<ProtectionItem>(user.protection.id);

  const classArmor =
    userClass.data.baseArmor + userClass.data.attributesPerLevel.baseArmor * user.level;

  const raceArmor = userRace.data.facilities.reduce(
    (p, c) => (c.facility === 'baseArmor' ? p + c.boostPerLevel * user.level : 0),
    0,
  );

  const protectionArmor =
    userProtection.data.armor + userProtection.data.perLevel * user.protection.level;

  return Math.floor(classArmor + raceArmor + userBlesses + protectionArmor);
};

export const getUserIntelligence = (user: RoleplayUserSchema): number => {
  const userClass = getClassById(user.class);
  const userRace = getRaceById(user.race);
  const userBlesses = makeBlessingStatusUpgrade('intelligence', user.blesses.intelligence);

  const classIntelligence =
    userClass.data.baseIntelligence +
    userClass.data.attributesPerLevel.baseIntelligence * user.level;

  const raceIntellience = userRace.data.facilities.reduce(
    (p, c) => (c.facility === 'baseIntelligence' ? p + c.boostPerLevel * user.level : 0),
    0,
  );

  return Math.floor(classIntelligence + raceIntellience + userBlesses);
};

export const getUserAgility = (user: RoleplayUserSchema): number => {
  const userClass = getClassById(user.class);
  const userRace = getRaceById(user.race);
  const userBlesses = makeBlessingStatusUpgrade('agility', user.blesses.agility);
  const classAgility =
    userClass.data.baseAgility + userClass.data.attributesPerLevel.baseAgility * user.level;

  const raceAgility = userRace.data.facilities.reduce(
    (p, c) => (c.facility === 'baseAgility' ? p + c.boostPerLevel * user.level : 0),
    0,
  );

  return Math.floor(classAgility + raceAgility + userBlesses);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const calculateUserPenetration = (user: RoleplayUserSchema): number => 0;

export const calculateDodge = (userAgility: number, enemyAgility: number): number => {
  const agilityDiff = Math.max((userAgility - enemyAgility) / 100, 0);
  const sigmoid = 20 / (1 + Math.E ** -agilityDiff);

  return sigmoid;
};

export const didUserDodged = (chance: number): boolean => {
  const randomValue = Math.random() * 100;

  return randomValue < chance;
};

export const calculateAttackSuccess = (userAgility: number, enemyAgility: number): number => {
  const agilityDiff = Math.max((enemyAgility - userAgility) / 100, 0);
  const sigmoid = 30 / (1 + Math.E ** -agilityDiff);

  return sigmoid;
};

export const didUserHit = (chance: number): boolean => {
  const randomValue = Math.random() * 100;

  return randomValue > chance;
};

export const calculateEffectiveDamage = (
  attackerDamage: number,
  attackerPenetration: number,
  defenderArmor: number,
): number =>
  // Reference: https://www.reddit.com/r/gamedesign/comments/2dyd99/question_armor_calculation_for_rpgs/
  Math.floor(
    attackerDamage -
      (attackerDamage *
        Math.max(defenderArmor * (1 - attackerPenetration / 100), 0) ** (1 / 1.33)) /
        100,
  );

export const makeBlessingStatusUpgrade = (toBless: ToBLess, points: number): number => {
  switch (toBless) {
    case 'life':
      return points * 20;
    case 'mana':
      return points * 10;
    case 'intelligence':
      return points * 7;
    case 'armor':
      return points * 5;
    case 'damage':
      return points * 6;
    case 'agility':
      return points * 5;
  }
};

export const getAbilityNextLevelBlessings = (abilityLevel: number): number => {
  const toNext: { [level: number]: number } = {
    0: 1,
    1: 5,
    2: 15,
    3: 30,
    4: 60,
    5: 100,
  };

  return toNext[abilityLevel];
};

export const nextLevelXp = (userLevel: number): number =>
  Math.floor(BASE_XP * userLevel ** DIFFICULT_TO_LEVEL_UP);

export const getAbilityDamage = (ability: UserAbility, userIntelligence: number): number => {
  const resolvedAbility = getAbilityById(ability.id);

  const baseDamage =
    resolvedAbility.data.damage.base + resolvedAbility.data.boostPerLevel.damage * ability.level;
  const scaleDamage = (resolvedAbility.data.damage.scale / 100) * userIntelligence;

  return Math.floor(baseDamage + scaleDamage);
};

export const getAbilityHeal = (ability: UserAbility, userIntelligence: number): number => {
  const resolvedAbility = getAbilityById(ability.id);

  if (resolvedAbility.data.heal.base === 0) return 0;

  const baseHeal =
    resolvedAbility.data.heal.base + resolvedAbility.data.boostPerLevel.heal * ability.level;
  const scaleHeal = (resolvedAbility.data.heal.scale / 100) * userIntelligence;

  return Math.floor(baseHeal + scaleHeal);
};

export const getAbilityCost = (ability: UserAbility): number => {
  const resolvedAbility = getAbilityById(ability.id);

  return Math.floor(
    resolvedAbility.data.cost + resolvedAbility.data.boostPerLevel.cost * ability.level,
  );
};
