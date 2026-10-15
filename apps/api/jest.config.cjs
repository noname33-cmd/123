module.exports = {testEnvironment: 'node', transform: {'^.+\\.ts$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.json'}]}, testMatch: ['<rootDir>/test/**/*.spec.ts']};
