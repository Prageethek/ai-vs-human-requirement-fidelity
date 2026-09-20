const { execSync } = require('child_process');
const path = require('path');

const targetModule = path.resolve(__dirname, '../../../src/method_1_baseline/shopping_cart/gemini_cart.js');

console.log('====================================================================');
console.log('Running Deterministic Firewall: Baseline NLP Track | Gemini 3.1 Pro');
console.log('====================================================================\n');

try {
  execSync('npx jest tests/suites/cart_assertions.test.js --verbose', {
    stdio: 'inherit',
    env: { ...process.env, TARGET_MODULE: targetModule }
  });
} catch (error) {
  console.log('\n Execution finished with failed assertions (Expected ~9 failures / 36.0% FDR).');
}