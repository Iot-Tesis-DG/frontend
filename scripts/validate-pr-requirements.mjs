import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const JSON_PATH = path.join(rootDir, 'requirements', 'generated', 'user-stories.json');

const MAINTENANCE_BRANCH_RULES = [
  {
    prefix: 'bugfix/',
    type: 'bugfix',
    regex: /^bugfix\/bug-\d+-[a-z0-9]+(-[a-z0-9]+)*$/,
    format: 'bugfix/bug-<number>-<short-description>',
  },
  {
    prefix: 'hotfix/',
    type: 'hotfix',
    regex: /^hotfix\/bug-\d+-[a-z0-9]+(-[a-z0-9]+)*$/,
    format: 'hotfix/bug-<number>-<short-description>',
  },
  {
    prefix: 'refactor/',
    type: 'refactor',
    regex: /^refactor\/[a-z0-9]+(-[a-z0-9]+)*$/,
    format: 'refactor/<short-description>',
  },
  {
    prefix: 'test/',
    type: 'test',
    regex: /^test\/[a-z0-9]+(-[a-z0-9]+)*$/,
    format: 'test/<short-description>',
  },
  {
    prefix: 'chore/',
    type: 'chore',
    regex: /^chore\/[a-z0-9]+(-[a-z0-9]+)*$/,
    format: 'chore/<short-description>',
  },
  {
    prefix: 'docs/',
    type: 'docs',
    regex: /^docs\/[a-z0-9]+(-[a-z0-9]+)*$/,
    format: 'docs/<short-description>',
  },
];

function fail(message) {
  console.error(`[FAIL] Requirements Policy\n\n${message}\n`);
  process.exit(1);
}

function validatePR() {
  const { PR_BASE, PR_HEAD, PR_TITLE, PR_BODY } = process.env;

  if (!PR_BASE) {
    fail('Missing required environment variable: PR_BASE');
  }

  if (!PR_HEAD) {
    fail('Missing required environment variable: PR_HEAD');
  }

  // 1. Validate target base branch
  if (PR_BASE !== 'staging') {
    fail(`Base branch must be "staging", but received "${PR_BASE}".`);
  }

  // 2. Check if branch matches any maintenance branch prefix
  const maintenanceRule = MAINTENANCE_BRANCH_RULES.find((rule) =>
    PR_HEAD.startsWith(rule.prefix)
  );

  if (maintenanceRule) {
    if (!maintenanceRule.regex.test(PR_HEAD)) {
      fail(
        `Malformed ${maintenanceRule.type} branch name: "${PR_HEAD}".\nExpected format: ${maintenanceRule.format}\nRequirements: lowercase alphanumeric kebab-case.`
      );
    }

    console.log(
      `[PASS] Requirements Policy\n\nBranch type: ${maintenanceRule.type}\nUser Story validation: NOT REQUIRED\n`
    );
    process.exit(0);
  }

  // 3. If not maintenance, check if it starts with feature/
  if (!PR_HEAD.startsWith('feature/')) {
    const allowedPrefixes = ['feature/', ...MAINTENANCE_BRANCH_RULES.map((r) => r.prefix)];
    fail(
      `Invalid branch prefix for "${PR_HEAD}".\nAllowed prefixes: ${allowedPrefixes.join(', ')}`
    );
  }

  // 4. Validate feature branch pattern: ^feature/hu-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$
  const featureBranchRegex = /^feature\/(hu-\d{2})-[a-z0-9]+(-[a-z0-9]+)*$/;
  const branchMatch = PR_HEAD.match(featureBranchRegex);

  if (!branchMatch) {
    fail(
      `Malformed feature branch name: "${PR_HEAD}".\nExpected format: feature/hu-XX-<short-description> (e.g. feature/hu-31-thermal-trend)\nRequirements: lowercase alphanumeric kebab-case.`
    );
  }

  const huId = branchMatch[1].toUpperCase(); // e.g. "HU-31"

  // 5. Read requirements JSON
  let requirementsData;
  try {
    if (!fs.existsSync(JSON_PATH)) {
      fail(`Requirements JSON file not found at: ${JSON_PATH}`);
    }
    const raw = fs.readFileSync(JSON_PATH, 'utf8');
    requirementsData = JSON.parse(raw);
  } catch (err) {
    fail(`Requirements JSON is invalid or cannot be parsed: ${err.message}`);
  }

  if (!requirementsData || !Array.isArray(requirementsData.userStories)) {
    fail('Requirements JSON is invalid: missing "userStories" array.');
  }

  const userStory = requirementsData.userStories.find((us) => us.id === huId);
  if (!userStory) {
    fail(
      `User Story "${huId}" does not exist in requirements/generated/user-stories.json.`
    );
  }

  const expectedCAs = (userStory.acceptanceCriteria || []).map((ca) => ca.id);
  if (expectedCAs.length === 0) {
    fail(`User Story ${huId} has no Acceptance Criteria configured in requirements JSON.`);
  }

  // 6. Validate PR title contains HU ID
  if (!PR_TITLE) {
    fail(`PR title is empty or missing. Title must contain ${huId}.`);
  }

  const titleContainsHu = new RegExp(`(^|[^A-Za-z0-9-])${huId}([^A-Za-z0-9-]|$)`, 'i').test(
    PR_TITLE
  );

  if (!titleContainsHu) {
    fail(
      `HU ID in title does not match branch HU.\nExpected title to contain: ${huId}\nActual title: "${PR_TITLE}"\nRecommended format: "[${huId}] <description>"`
    );
  }

  // 7. Validate PR body
  if (!PR_BODY || PR_BODY.trim().length === 0) {
    fail(
      `PR body is empty. Body must declare "User Story: ${huId}" and list all Acceptance Criteria.`
    );
  }

  // Detect all User Story declarations in PR body
  const userStoryDeclarations = [
    ...PR_BODY.matchAll(/(?:^|\n)\s*User\s+Story:\s*([^\r\n]*)/gi),
  ];

  if (userStoryDeclarations.length === 0) {
    fail(`PR body must contain: "User Story: ${huId}".`);
  }

  if (userStoryDeclarations.length > 1) {
    const list = userStoryDeclarations.map((m) => `- "${m[0].trim()}"`).join('\n');
    fail(
      `Multiple User Story declarations found in PR body. Exactly one is allowed:\n${list}`
    );
  }

  const declaredRaw = userStoryDeclarations[0][1].trim();
  const declaredTokens = declaredRaw.split(/\s+/).filter(Boolean);

  if (declaredTokens.length === 0) {
    fail(`Empty User Story declaration in PR body. Expected: "User Story: ${huId}".`);
  }

  if (declaredTokens.length > 1) {
    fail(
      `Ambiguous User Story declaration in PR body: "User Story: ${declaredRaw}".\nExpected exactly: "User Story: ${huId}".`
    );
  }

  const declaredHu = declaredTokens[0].toUpperCase();
  if (declaredHu !== huId) {
    fail(
      `HU ID in PR body does not match branch HU.\nBranch HU: ${huId}\nBody User Story: "${declaredRaw}"`
    );
  }

  // 8. Validate Acceptance Criteria references in PR body
  const allCaMatches = [
    ...PR_BODY.matchAll(/\bCA-(HU-\d{2}-\d+)\b/gi),
  ].map((m) => `CA-${m[1].toUpperCase()}`);

  // Check duplicate references
  const caCounts = new Map();
  for (const ca of allCaMatches) {
    caCounts.set(ca, (caCounts.get(ca) || 0) + 1);
  }

  const duplicates = [...caCounts.entries()].filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    const dupList = duplicates
      .map(([id, count]) => `- ${id} (referenced ${count} times)`)
      .join('\n');
    fail(`Duplicate Acceptance Criterion references found in PR body:\n${dupList}`);
  }

  // Check foreign Acceptance Criteria (belonging to another HU)
  const foreignCAs = allCaMatches.filter((ca) => !ca.startsWith(`CA-${huId}-`));
  if (foreignCAs.length > 0) {
    const foreignList = [...new Set(foreignCAs)]
      .map((ca) => `- ${ca}`)
      .join('\n');
    fail(
      `Acceptance Criteria from other User Stories found in PR body:\n${foreignList}\nExpected only Acceptance Criteria belonging to ${huId}.`
    );
  }

  // Check missing Acceptance Criteria
  const referencedSet = new Set(allCaMatches);
  const missingCAs = expectedCAs.filter((ca) => !referencedSet.has(ca));

  if (missingCAs.length > 0) {
    const missingList = missingCAs.map((ca) => `- ${ca}`).join('\n');
    fail(
      `User Story: ${huId}\n\nMissing Acceptance Criteria:\n${missingList}\n\nExpected: ${expectedCAs.length}\nReferenced: ${expectedCAs.length - missingCAs.length}`
    );
  }

  // All checks passed!
  console.log(
    `[PASS] Requirements Policy\n\nUser Story:\n${huId} — ${userStory.title}\n\nBranch:\n${PR_HEAD}\n\nAcceptance Criteria:\n${expectedCAs.length}/${expectedCAs.length} referenced\n\n${expectedCAs.map((ca) => `- ${ca}`).join('\n')}\n\nTraceability:\nPASS\n`
  );
  process.exit(0);
}

validatePR();
