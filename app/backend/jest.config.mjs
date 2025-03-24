export default {
  transform: {},
  testEnvironment: "node",
  verbose: true,
  extensionsToTreatAsEsm: [".mjs"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
