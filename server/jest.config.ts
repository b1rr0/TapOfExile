import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // Override tsconfig paths so ts-jest resolves @shared/* correctly
        // (tsconfig.json has wrong "shared/*" relative to baseUrl "./" = server dir)
        baseUrl: '.',
        paths: {
          '@shared/*': ['../shared/*'],
          '@/*': ['src/*'],
        },
      },
    }],
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
};

export default config;
