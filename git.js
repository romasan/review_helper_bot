const { exec } = require('child_process');
const path = require('path');
const util = require('util');
require("dotenv").config();

const execPromise = util.promisify(exec);

const { GIT_PROJECT_PATH } = process.env;

const repoPath = path.resolve(GIT_PROJECT_PATH);

const list = {};

const tail = async (_branch) => {
  delete list[_branch];

  if (Object.keys(list).length) {
    const { branch, log } = Object.values(list).sort((a, b) => a.date > b.date ? 1 : -1)[0];

    void pushEmpty(branch, log);
  }
};

const getList = () => {
  return Object.values(list)
    .sort((a, b) => a.date > b.date ? 1 : -1)
    .map(({ branch, inProgress }) => `- ${branch}${inProgress ? ' [in progress]' : ''}`)
    .join('\n');
};

const pushEmpty = async (branch, log) => {
  list[branch].inProgress = true;
  await log(`Начал обрабатывать ветку ${branch},\n${getList()}`);

  try {
    await execPromise('git fetch --all', { cwd: repoPath });
    // await log('Подтянул список веток');

    const { stdout: branchList } = await execPromise(`git branch -va | grep "${branch}" || echo ""`, { cwd: repoPath });

    if (!branchList.includes(branch)) {
      throw new Error(`Ветка ${branch} не найдена`);
    }

    await execPromise(`git checkout ${branch}`, { cwd: repoPath });
    // await log(`Переключился на ветку ${branch}`);

    await execPromise(`git pull origin ${branch}`, { cwd: repoPath });
    // await log(`Подтянул изменения из ${branch}`);

    // const { stdout: logOutput } = await execPromise('git log -1', { cwd: repoPath });
    // await log(`Последний коммит:\n${logOutput}`);

    await execPromise(`git commit --allow-empty -m "${branch}: empty"`, { cwd: repoPath });
    // await log('Создал пустой коммит');

    await execPromise(`git push origin ${branch}`, { cwd: repoPath });
    await log(`✅ Запушил коммит, ветка https://${branch}.founder-tv-alpha.my.cloud.devmail.ru/ скоро будет доступна на альфе`);

  } catch (error) {
    await log(`❌ Ошибка: ${error.stderr || error.message}`);
  }

  tail(branch);
};

let index = 0;

const addToList = async (branch, log) => {
  const branches = Array.isArray(branch) ? branch : [branch];

  // if (list[branch]) {
  //   await log(`Ветка ${branch} уже есть в очереди`);

  //   return;
  // }

  const length = Object.keys(list).length;

  for (const _branch of branches) {
    if (list[_branch]) {
      await log(`Ветка ${_branch} уже есть в очереди,\n${getList()}`);

      continue;
    }

    list[_branch] = {
      branch: _branch,
      log,
      date: ++index, // Date.now(),
      inProgress: false,
    };
  }

  if (length === 0) {
    void pushEmpty(branches[0], log);
  } else {
    await log(`Перед тобой очередь из ${length} веток`);
  }
};

module.exports = {
  addToList,
};
