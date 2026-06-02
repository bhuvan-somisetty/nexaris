const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = [
  path.join(__dirname, '../src'),
];

const SECRET_PATTERNS = [
  /jwt_secret\s*=\s*['"][a-zA-Z0-9_-]{8,}['"]/i,
  /api_key\s*=\s*['"][a-zA-Z0-9_-]{8,}['"]/i,
  /password\s*=\s*['"][a-zA-Z0-9_-]{8,}['"]/i,
  /private_key\s*=\s*['"].*['"]/i,
  /client_secret\s*=\s*['"][a-zA-Z0-9_-]{8,}['"]/i,
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];

  lines.forEach((line, index) => {
    // Skip imports or environment variable placeholders
    if (line.includes('process.env') || line.includes('import') || line.includes('require')) {
      return;
    }

    SECRET_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        findings.push({
          line: index + 1,
          content: line.trim(),
          pattern: pattern.toString(),
        });
      }
    });
  });

  return findings;
}

function scanDirectory(dir) {
  let allFindings = {};
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      Object.assign(allFindings, scanDirectory(fullPath));
    } else if (stat.isFile() && /\.(ts|js)$/.test(file)) {
      const findings = scanFile(fullPath);
      if (findings.length > 0) {
        allFindings[fullPath] = findings;
      }
    }
  });

  return allFindings;
}

console.log('Starting credentials and hardcoded secrets scan...');
let totalFindings = 0;

DIRECTORIES_TO_SCAN.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  const findings = scanDirectory(dir);
  
  Object.entries(findings).forEach(([file, list]) => {
    console.error(`\n[WARNING] Secrets found in file: ${file}`);
    list.forEach((f) => {
      console.error(`  -> Line ${f.line}: ${f.content} (Matched: ${f.pattern})`);
      totalFindings++;
    });
  });
});

if (totalFindings > 0) {
  console.error(`\nScan failed. Found ${totalFindings} hardcoded secrets/passwords.`);
  process.exit(1);
} else {
  console.log('\nScan completed successfully. Zero hardcoded secrets found in source directories.');
  process.exit(0);
}
