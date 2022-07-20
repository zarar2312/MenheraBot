import axios from 'axios';
import { getEnviroments } from 'config';
import { logger } from 'utils/logger';
import { debugError } from '../utils/debugError';

export interface AssetsLimit {
  angry: number;
  bicuda: number;
  bite: number;
  cheek: number;
  cry: number;
  disgusted: number;
  fear: number;
  fodase: number;
  grumble: number;
  hug: number;
  humor: number;
  kill: number;
  kiss: number;
  laugh: number;
  mamar: number;
  pat: number;
  poke: number;
  punch: number;
  resurrect: number;
  sarrar: number;
  // eslint-disable-next-line camelcase
  sarrar_sozinho: number;
  shot: number;
  shy: number;
  slap: number;
  sniff: number;
  think: number;
}

let assetsLimit: AssetsLimit;

export const getAssetLink = (type: keyof AssetsLimit): string => {
  if (!assetsLimit || !assetsLimit[type]) return 'https://i.imgur.com/HftTDov.png';

  const random = Math.floor(Math.random() * assetsLimit[type]);

  const extension = type === 'humor' || type === 'fodase' ? 'png' : 'gif';

  return `${process.env.CDN_URL}/images/${type}/${random}.${extension}`;
};

export const updateAssets = async (): Promise<void> => {
  const { CND_URL } = getEnviroments(['CND_URL']);
  const result = await axios.get(CND_URL).catch(debugError);
  if (!result) return logger.error('Error when updating assets');

  assetsLimit = result.data;

  return logger.info('Assets have been updated');
};
