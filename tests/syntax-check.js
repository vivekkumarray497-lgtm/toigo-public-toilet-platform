const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let count = 0;
function checkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.gradle' && entry.name !== 'build') {
                checkDir(fullPath);
            }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            execSync(`node --check "${fullPath}"`);
            count++;
            console.log(`✓ Syntax verified: ${path.relative(process.cwd(), fullPath)}`);
        }
    }
}

console.log('🔍 Checking syntax of all JavaScript files...');
checkDir('.');
console.log(`\n🎉 ALL ${count} JAVASCRIPT FILES PASSED SYNTAX CHECK!\n`);
