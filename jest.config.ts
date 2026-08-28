import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  setupFiles: ["./jest.setup.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", strict: false } }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/__tests__/streaming.test.tsx",
    "<rootDir>/__tests__/streaming-pages.test.tsx",
  ],
};

export default config;
