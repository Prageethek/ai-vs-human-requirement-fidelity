const { execSync } = require('child_process');
const path = require('path');

const targetModule = path.resolve(__dirname, '../../../src/method_2_sdd/shopping_cart/gemini_cart.js');

console.log('====================================================================');
console.log('Running Deterministic Firewall: SDD Approach Track | Gemini 3.1 Pro');
console.log('====================================================================\n');

try {
  execSync('npx jest tests/suites/cart_assertions.test.js --verbose', {
    stdio: 'inherit',
    env: { ...process.env, TARGET_MODULE: targetModule }
  });
} catch (error) {
  console.log('\nExecution finished with failed assertions (Expected ~3 failures / 12.0% FDR).');
}