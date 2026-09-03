import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SOURCE_PATH = path.join(rootDir, 'requirements', 'user-stories.md');
const TARGET_DIR = path.join(rootDir, 'requirements', 'generated');
const TARGET_PATH = path.join(TARGET_DIR, 'user-stories.json');
const RELATIVE_SOURCE = 'requirements/user-stories.md';

const isCheckMode = process.argv.includes('--check');

function fail(message) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
  process.exit(1);
}

function parseUserStories() {
  if (!fs.existsSync(SOURCE_PATH)) {
    fail(`Source file not found at: ${SOURCE_PATH}`);
  }

  const rawContent = fs.readFileSync(SOURCE_PATH, 'utf8');

  // Match all HU sections: ## HU-XX — Title
  const huHeadingRegex = /^##\s+(HU-\d+)\s+[—-]\s+(.*)$/gm;
  const matches = [];
  let match;

  while ((match = huHeadingRegex.exec(rawContent)) !== null) {
    matches.push({
      id: match[1],
      title: match[2].trim(),
      startIndex: match.index,
    });
  }

  if (matches.length !== 51) {
    fail(`Expected exactly 51 User Stories, but found ${matches.length}.`);
  }

  const userStories = [];
  const seenHuIds = new Set();
  const allAcceptanceCriteriaIds = new Set();
  let totalCriteriaCount = 0;

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const huId = cur.id;

    // Validate ID format: HU-01 .. HU-51
    const idNumberMatch = huId.match(/^HU-(\d{2})$/);
    if (!idNumberMatch) {
      fail(`Malformed HU ID format: "${huId}". Must match HU-XX.`);
    }

    const expectedNumber = i + 1;
    const actualNumber = parseInt(idNumberMatch[1], 10);
    const expectedId = `HU-${expectedNumber < 10 ? '0' + expectedNumber : expectedNumber}`;

    if (huId !== expectedId) {
      fail(`Sequence error at index ${expectedNumber}: expected ${expectedId}, but got ${huId}.`);
    }

    if (seenHuIds.has(huId)) {
      fail(`Duplicate HU ID detected: ${huId}`);
    }
    seenHuIds.add(huId);

    if (!cur.title || cur.title.length === 0) {
      fail(`Missing title for ${huId}`);
    }

    // Determine slice range for current HU block
    const nextStart =
      i + 1 < matches.length
        ? matches[i + 1].startIndex
        : rawContent.indexOf('## 6. Control matemático obligatorio');

    const block = rawContent.slice(
      cur.startIndex,
      nextStart !== -1 ? nextStart : rawContent.length
    );

    // Extract metadata
    const epicMatch = block.match(/\*\*EPIC:\*\*\s*([^\n]+)/);
    if (!epicMatch || !epicMatch[1].trim()) {
      fail(`Missing EPIC for ${huId}`);
    }
    const epic = epicMatch[1].trim();

    const roleMatch = block.match(/\*\*Rol:\*\*\s*([^\n]+)/);
    if (!roleMatch || !roleMatch[1].trim()) {
      fail(`Missing role for ${huId}`);
    }
    const role = roleMatch[1].trim();

    // Statement: **User Story:** \n > Como ...
    const statementMatch = block.match(/\*\*User Story:\*\*\s*\n+>\s*([^\n]+(?:\n>[^\n]+)*)/);
    if (!statementMatch || !statementMatch[1].trim()) {
      fail(`Missing User Story statement for ${huId}`);
    }
    const statement = statementMatch[1].replace(/\n>\s*/g, ' ').trim();

    // Priority
    const priorityMatch = block.match(/\*\*Prioridad:\*\*\s*([^\n]+)/);
    if (!priorityMatch || !priorityMatch[1].trim()) {
      fail(`Missing priority for ${huId}`);
    }
    const priority = priorityMatch[1].trim();

    // Sprint
    const sprintMatch = block.match(/\*\*Sprint actual:\*\*\s*([^\n]+)/);
    if (!sprintMatch || !sprintMatch[1].trim()) {
      fail(`Missing sprint for ${huId}`);
    }
    const sprint = sprintMatch[1].trim();

    // Story Points
    const spMatch = block.match(/\*\*Story Points actuales:\*\*\s*([^\n]+)/);
    if (!spMatch || !spMatch[1].trim()) {
      fail(`Missing story points for ${huId}`);
    }
    const storyPoints = parseInt(spMatch[1].trim(), 10);
    if (isNaN(storyPoints)) {
      fail(`Invalid story points for ${huId}: "${spMatch[1].trim()}"`);
    }

    // Dependencies
    const depMatch = block.match(/\*\*Dependencias:\*\*\s*([^\n]+)/);
    if (!depMatch || !depMatch[1].trim()) {
      fail(`Missing dependencies for ${huId}`);
    }
    const dependencies = depMatch[1].trim();

    // Thesis justification
    const justMatch = block.match(/\*\*Justificación dentro de la tesis:\*\*\s*([^\n]+)/);
    if (!justMatch || !justMatch[1].trim()) {
      fail(`Missing thesis justification for ${huId}`);
    }
    const thesisJustification = justMatch[1].trim();

    // Criterios de aceptación
    const acHeaderMatch = block.match(/###\s+Criterios de aceptación\s*\n+/);
    if (!acHeaderMatch) {
      fail(`Missing "### Criterios de aceptación" section for ${huId}`);
    }

    const fromAC = block.slice(acHeaderMatch.index + acHeaderMatch[0].length);
    const endAcMatch = fromAC.match(/\n\*\*[A-ZÁÉÍÓÚa-záéíóú\s]+:\*\*/);
    const acSectionText = endAcMatch ? fromAC.slice(0, endAcMatch.index) : fromAC;

    const rawItems = acSectionText
      .split(/\n(?=\d+\.\s+)/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawItems.length === 0) {
      fail(`User Story ${huId} has 0 Acceptance Criteria.`);
    }

    const acceptanceCriteria = [];
    for (let j = 0; j < rawItems.length; j++) {
      const itemText = rawItems[j];
      const itemMatch = itemText.match(/^(\d+)\.\s+([\s\S]+)$/);
      if (!itemMatch) {
        fail(`Malformed Acceptance Criterion in ${huId}: "${itemText}"`);
      }

      const itemNumber = parseInt(itemMatch[1], 10);
      const expectedItemNumber = j + 1;
      if (itemNumber !== expectedItemNumber) {
        fail(
          `Non-sequential Acceptance Criterion in ${huId}: expected ${expectedItemNumber}, got ${itemNumber}`
        );
      }

      const caId = `CA-${huId}-${itemNumber}`;
      if (allAcceptanceCriteriaIds.has(caId)) {
        fail(`Duplicate Acceptance Criterion ID detected: ${caId}`);
      }
      allAcceptanceCriteriaIds.add(caId);

      const cleanedText = itemMatch[2].replace(/\s+/g, ' ').trim();
      if (!cleanedText) {
        fail(`Empty text for Acceptance Criterion ${caId}`);
      }

      acceptanceCriteria.push({
        id: caId,
        number: itemNumber,
        text: cleanedText,
      });
    }

    totalCriteriaCount += acceptanceCriteria.length;

    userStories.push({
      id: huId,
      title: cur.title,
      epic,
      role,
      statement,
      acceptanceCriteria,
      priority,
      sprint,
      storyPoints,
      dependencies,
      thesisJustification,
    });
  }

  if (totalCriteriaCount !== 180) {
    fail(`Expected exactly 180 total Acceptance Criteria, but found ${totalCriteriaCount}.`);
  }

  const generatedData = {
    schemaVersion: 1,
    source: RELATIVE_SOURCE,
    userStories,
  };

  let serializedJson;
  try {
    serializedJson = JSON.stringify(generatedData, null, 2) + '\n';
  } catch (err) {
    fail(`Generated JSON serialization failed: ${err.message}`);
  }

  if (isCheckMode) {
    if (!fs.existsSync(TARGET_PATH)) {
      fail(
        `Check failed: Target file "${TARGET_PATH}" does not exist. Run "npm run requirements:generate" first.`
      );
    }

    const existingContent = fs.readFileSync(TARGET_PATH, 'utf8');
    if (existingContent !== serializedJson) {
      fail(
        `Check failed: "${TARGET_PATH}" is outdated or diverged from "${RELATIVE_SOURCE}". Run "npm run requirements:generate" to synchronize.`
      );
    }

    console.log(
      `\x1b[32m[PASS]\x1b[0m All 51 User Stories and ${totalCriteriaCount} Acceptance Criteria verified and in sync with canonical JSON.`
    );
  } else {
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    fs.writeFileSync(TARGET_PATH, serializedJson, 'utf8');
    console.log(
      `\x1b[32m[SUCCESS]\x1b[0m Generated ${TARGET_PATH} successfully (${userStories.length} User Stories, ${totalCriteriaCount} Acceptance Criteria).`
    );
  }
}

parseUserStories();
