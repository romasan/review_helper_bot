const http = require('http');
const fetch = require('node-fetch');
const url = require('url');
require("dotenv").config();

const { PROXY_PORT } = process.env;

// curl -H 'X-Host: https://qwerty.ru' -H 'Authorization: Bearer 1234567' localhost:3001/foo/bar
// curl -H 'Authorization: Bearer x1234567' localhost:3001/foo/bar?x-host=https://qwerty.ru&x-authorization=Bearer%20x1234567

const webServer = http.createServer(async (req, res) => {
    const query = url.parse(req.url, true).query;

    console.log('req:', req.url, query);

    const host = req.headers['x-host'] || query['x-host'];
    const authorization = req.headers['authorization'] || query['x-authorization'];
    const cb = req.headers['x-callback'] || query['x-callback'];

    delete query['x-host'];
    delete query['x-authorization'];
    delete query['x-callback'];

    if (host) {
        const resp = await fetch(host + req.url, {
            headers: {
                'Authorization': authorization,
            },
        });

        const raw = await resp.text();

        if (cb) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(`window['${cb}'](\`${raw}\`)`);

            return;
        }

        res.end(raw);

        return;
    }

    res.end('empty x-host');
});

webServer.listen(parseInt(PROXY_PORT));
console.log(`start proxy on ${parseInt(PROXY_PORT)} port at ${new Date()}`);
