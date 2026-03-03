import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from './en/common.json';
import homeEn from './en/home.json';
import wikiEn from './en/wiki.json';
import charactersEn from './en/characters.json';
import equipmentEn from './en/equipment.json';
import enemiesEn from './en/enemies.json';
import damageEn from './en/damage.json';
import plotEn from './en/plot.json';
import mapsEn from './en/maps.json';
import skillTreeEn from './en/skillTree.json';
import tradeEn from './en/trade.json';
import championsEn from './en/champions.json';

import commonUa from './ua/common.json';
import homeUa from './ua/home.json';
import wikiUa from './ua/wiki.json';
import charactersUa from './ua/characters.json';
import equipmentUa from './ua/equipment.json';
import enemiesUa from './ua/enemies.json';
import damageUa from './ua/damage.json';
import plotUa from './ua/plot.json';
import mapsUa from './ua/maps.json';
import skillTreeUa from './ua/skillTree.json';
import tradeUa from './ua/trade.json';
import championsUa from './ua/champions.json';

export const SUPPORTED_LANGS = ['en', 'ua'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: commonEn,
      home: homeEn,
      wiki: wikiEn,
      characters: charactersEn,
      equipment: equipmentEn,
      enemies: enemiesEn,
      damage: damageEn,
      plot: plotEn,
      maps: mapsEn,
      skillTree: skillTreeEn,
      trade: tradeEn,
      champions: championsEn,
    },
    ua: {
      common: commonUa,
      home: homeUa,
      wiki: wikiUa,
      characters: charactersUa,
      equipment: equipmentUa,
      enemies: enemiesUa,
      damage: damageUa,
      plot: plotUa,
      maps: mapsUa,
      skillTree: skillTreeUa,
      trade: tradeUa,
      champions: championsUa,
    },
  },
  lng: (typeof localStorage !== 'undefined' && localStorage.getItem('toe-lang')) || 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
