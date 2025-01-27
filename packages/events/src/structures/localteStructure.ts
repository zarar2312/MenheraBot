import { readdirSync } from 'node:fs';
import path from 'node:path';
import i18next from 'i18next';
import translationBackend from 'i18next-fs-backend';
import { fileURLToPath } from 'node:url';

import { logger } from '../utils/logger';
import { debugError } from '../utils/debugError';

// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const availableLanguages = ['pt-BR', 'en-US'];
const namespaces = readdirSync(path.resolve(__dirname, '..', '..', 'locales', 'pt-BR')).map((a) =>
  a.replace('.json', ''),
);

const loadLocales = async (): Promise<void> => {
  const filepath = path.resolve(__dirname, '..', '..', 'locales');

  await i18next
    .use(translationBackend)
    .init({
      ns: namespaces,
      preload: readdirSync(filepath),
      fallbackLng: 'pt-BR',
      backend: {
        loadPath: `${filepath}/{{lng}}/{{ns}}.json`,
      },
      interpolation: {
        escapeValue: false,
      },
      returnEmptyString: false,
    })
    .then(() => {
      logger.info('[LOCALES] Locales loaded!');
    })
    .catch((e) => {
      logger.info(`[LOCALES] Locales failed on loading: ${e.message}`);
    });
};

const reloadLocales = async (): Promise<void> => {
  await i18next.reloadResources(availableLanguages, namespaces).catch(debugError);
};

export { loadLocales, reloadLocales };
