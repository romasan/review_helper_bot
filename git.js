const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const fs = require('fs');
const { getPipelinesForCommit } = require('./gitlab');
require("dotenv").config();

const execPromise = util.promisify(exec);
const readDircPromise = util.promisify(fs.readdir);

const { GIT_PROJECT_PATH, DEBUG_MODE } = process.env;

const repoPath = path.resolve(GIT_PROJECT_PATH);

const list = {};

const watchPipeline = async (branch, commit, log, time, link) => {
  if (!commit) {
    return;
  }

  if ((Date.now() - time) > 1000 * 60 * 60) {
    await log(`❌ За час час с пайплайном никаких подвижек, попробуй зайти на https://${branch}.founder-tv-alpha.my.cloud.devmail.ru/, если ветка не ожила повтори команду`);

    return;
  }

  try {
    const data = await getPipelinesForCommit(commit);

    if (data?.last_pipeline?.sha === commit) {
      if (!link && data?.last_pipeline?.web_url) {
        link = data?.last_pipeline?.web_url;

        await log(`👀 Слежу за пайплайном: ${link}`);
      }

      switch(data?.last_pipeline?.status) {
        case 'failed':
          await log(`❌ Пайплайн упал, видимо на ветке ${branch} не совсем валидный код, обратись к его автору`);

          return;
        case 'canceled':
          await log(`🛑 Пайплайн отменён`);

          return;
        case 'success':
          await log(`🎉 Пайплайн прошёл, ветка https://${branch}.founder-tv-alpha.my.cloud.devmail.ru/ доступна на альфе`);

          return;
      }
    }

    setTimeout(() => {
      watchPipeline(branch, commit, log, time || Date.now(), link);
    }, 1000 * 60);
  } catch (error) {
    log(`❌ Ошибка отслеживания пайплайна для ${branch}: ${error}`)
  }
};

const tail = async (_branch, commit) => {
  watchPipeline(_branch, commit, list[_branch].log);

  delete list[_branch];

  if (Object.keys(list).length) {
    const { branch, log } = Object.values(list).sort((a, b) => a.date > b.date ? 1 : -1)[0];

    void pushEmpty(branch, log);
  }
};

const getList = () => {
  if (Object.keys(list).length < 2) {
    return '';
  }

  const _list = Object.values(list)
    .sort((a, b) => a.date > b.date ? 1 : -1)
    .map(({ branch, inProgress }, index) => `${index + 1}) ${branch}${inProgress ? ' [in progress]' : ''}`)
    .join('\n');

  return 'Очередь:\n' + _list;
};

const pushEmpty = async (branch, log) => {
  list[branch].inProgress = true;

  let commit = '';

  await log(`👷 Начал подготавливать ветку ${branch}\n${getList()}`);

  try {
    await execPromise('git fetch --all', { cwd: repoPath });

    const { stdout: branchList } = await execPromise(`git branch -va | grep "${branch}" || echo ""`, { cwd: repoPath });

    if (!branchList.includes(branch)) {
      throw new Error(`Ветка ${branch} не найдена`);
    }

    await execPromise(`git checkout ${branch}`, { cwd: repoPath });

    await execPromise(`git reset --hard origin/${branch}`, { cwd: repoPath });

    await execPromise(`git pull origin ${branch}`, { cwd: repoPath });

    await execPromise(`git commit --allow-empty -m "${branch}: empty"`, { cwd: repoPath });

    const { stdout: logOutput } = await execPromise('git log -1', { cwd: repoPath });
    commit = logOutput.match(/([a-z0-9]{40})/ig)?.[0];

    await execPromise(`git push origin ${branch}`, { cwd: repoPath });
    await log(`✅ Запушил коммит, ветка ${branch} скоро будет доступна на альфе`);

  } catch (error) {
    await log(`❌ Ошибка: ${error.stderr || error.message}`);
  }

  tail(branch, commit);
};

let index = 0;

const addToList = async (branch, log) => {
  const branches = Array.isArray(branch) ? branch : [branch];
  const length = Object.keys(list).length;

  for (const _branch of branches) {
    if (list[_branch]) {
      await log(`Ветка ${_branch} уже есть в очереди\n${getList()}`);

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

const gitLogs = async ({ sdk, chatId, context }) => {
  const count = isNaN(parseInt(context)) ? 10 : parseInt(context);

  const files = (await readDircPromise(__dirname + '/logs'));
  const part = files
    .filter(f => f[0] !== '.')
    .sort((a, b) => parseInt(a.split('-')[0]) > parseInt(b.split('-')[0]) ? 1 : -1)
    .slice(-count)
    .map(line => {
      const [time, chatId] = line.split('-');

      return `${new Date(parseInt(time))} ${chatId}`;
    });

  sdk.sendText(chatId, part.join('\n') + `\n${part.length} of ${files.length - 1}`);
};

module.exports = {
  addToList,
  gitLogs,
};
