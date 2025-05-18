const fetch = require('node-fetch');
require("dotenv").config();

const { GITLAB_URL, API_TOKEN, PROJECT_ID } = process.env;

const GET = (url) => fetch(url, {
    headers: {
        'Private-Token': API_TOKEN,
    }
});

async function getPipelinesForCommit(commitHash) {
    const url = `${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/repository/commits/${commitHash}`;
    const response = await GET(url);

    if (!response.ok) {
        throw new Error(`Ошибка при получении пайплайнов: ${response.statusText}`);
    }
    return response.json();
};

module.exports = {
    getPipelinesForCommit,
};