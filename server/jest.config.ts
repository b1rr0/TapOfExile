import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
};

export default config;
