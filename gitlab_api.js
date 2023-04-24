const fetch = require("node-fetch");

// https://docs.gitlab.com/ee/api/rest/
// https://docs.gitlab.com/ee/api/projects.html
// /merge_requests?scope=all&state=opened&author_username=r.bauer

const TOKEN = '';
const API_URL = '';

const getAPI = async (query) => {
	const resp = await fetch(`${API_URL}${query}`, {
		headers: {
			'Authorization': `Bearer ${TOKEN}`,
		}
	});

	return await resp.json();
}

const showAllProjects = async () => {
	let list = [];

	let idle = true;
	let page = 1;
	for (;idle;) {
		const json = await getAPI(`projects?page=${page++}`);
		if (json.length > 0) {
			let founderProject = json.find(e => e.name === 'founder');
			if (founderProject) {
				console.log(`founder project found on #${page - 1} page`, founderProject);
			}
			list = list.concat(json.map(e => e.name))
		} else {
			idle = false;
		}
	}

	// console.log('===', json);
	// console.log('===', JSON.stringify(json, true, 2).slice(0, 500));
	// console.log('===', json.map(e => e.name));
	console.log(list);
	console.log(`Total projects: ${list.length}`)
	// console.log('===', json.filter(e => e.name === 'mydawnfe'));
}

const main = () => {
	// showAllProjects();
}

main();