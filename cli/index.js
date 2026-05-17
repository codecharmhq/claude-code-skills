#!/usr/bin/env node

const https = require('https');
const path = require('path');
const fs = require('fs');

const REPO = 'codecharmhq/claude-code-skills';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/master`;
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;

const USER_AGENT = 'codecharm-cli/1.0';

function getHeaders() {
  const headers = { 'User-Agent': USER_AGENT };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: getHeaders() }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function getSkillList() {
  const raw = await fetch(API_BASE);
  const items = JSON.parse(raw);
  return items
    .filter((i) => i.type === 'dir')
    .map((i) => i.name)
    .sort();
}

async function cmdList() {
  const skills = await getSkillList();
  if (skills.length === 0) {
    console.log('No skills found in the repository.');
    return;
  }
  console.log(`Available skills (${skills.length}):\n`);
  skills.forEach((s) => console.log(`  ${s}`));
}

async function cmdSearch(term) {
  const skills = await getSkillList();
  const lower = term.toLowerCase();
  const matched = skills.filter((s) => s.includes(lower));
  if (matched.length === 0) {
    console.log(`No skills matching "${term}".`);
    return;
  }
  console.log(`Skills matching "${term}" (${matched.length}):\n`);
  matched.forEach((s) => console.log(`  ${s}`));
}

async function cmdInstall(skillName) {
  if (!skillName) {
    console.error('Usage: npx codecharm install <skill-name>');
    process.exit(1);
  }

  const url = `${RAW_BASE}/${encodeURIComponent(skillName)}/SKILL.md`;
  let content;
  try {
    content = await fetch(url);
  } catch (err) {
    console.error(`Failed to download skill "${skillName}".`);
    console.error(`  ${err.message}`);
    console.error(`  Make sure the skill exists: npx codecharm list`);
    process.exit(1);
  }

  const targetDir = path.join(process.cwd(), '.claude', 'skills', skillName);
  const targetFile = path.join(targetDir, 'SKILL.md');

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, content, 'utf-8');

  console.log(`Installed "${skillName}" → ${targetFile}`);
}

async function cmdInit() {
  const dir = path.join(process.cwd(), '.claude', 'skills');
  fs.mkdirSync(dir, { recursive: true });

  const readme = path.join(dir, 'README.md');
  if (!fs.existsSync(readme)) {
    const readmeContent = `# Skills

Run \`npx codecharm list\` to see available skills.
Run \`npx codecharm install <skill-name>\` to install a skill.
`;
    fs.writeFileSync(readme, readmeContent, 'utf-8');
  }

  console.log(`Initialized skills directory: ${dir}`);
}

function help() {
  console.log(`
CodeCharm Skills CLI — Installer for the CodeCharmHQ skill ecosystem

Usage:
  npx codecharm init                  Create .claude/skills/ directory
  npx codecharm list                  List all available skills
  npx codecharm search <term>         Search skills by name
  npx codecharm install <skill-name>  Install a skill

Examples:
  npx codecharm install security-review
  npx codecharm search testing
  npx codecharm list
`);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'init':
      await cmdInit();
      break;
    case 'list':
      await cmdList();
      break;
    case 'search':
      await cmdSearch(args[1]);
      break;
    case 'install':
      await cmdInstall(args[1]);
      break;
    default:
      help();
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
