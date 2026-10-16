import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // React Compiler rules introduced with eslint-config-next 16. They flag
    // pre-existing (working) patterns; kept visible as warnings until the
    // affected components are refactored.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Local design-sync tooling, not part of the app
    '.ds-sync/**',
    '.design-sync/**',
    'ds-bundle/**',
  ]),
]);

export default eslintConfig;
