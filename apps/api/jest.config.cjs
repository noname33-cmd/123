module.exports = {testEnvironment: 'node', transform: {'^.+\\.ts$': ['ts-jest', {tsconfig: 'tsconfig.json'}]}, testMatch: ['<rootDir>/test/**/*.spec.ts']};
