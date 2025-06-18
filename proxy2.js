const http = require('http');
const fetch = require('node-fetch');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');

require("dotenv").config();

const { PROXY_PORT } = process.env;

// curl -H 'X-Host: https://qwerty.ru' -H 'Authorization: Bearer 1234567' localhost:3001/foo/bar
// curl -H 'Authorization: Bearer x1234567' localhost:3001/foo/bar?x-host=https://qwerty.ru&x-authorization=Bearer%20x1234567

// Генерация закрытого ключа
// openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048

// Извлечение открытого ключа из закрытого
// openssl rsa -pubout -in private_key.pem -out public_key.pem

function decryptMessage(privateKeyPem, encryptedMessageBase64) {
  // Преобразуем строку Base64 в Buffer
  const encryptedMessage = Buffer.from(encryptedMessageBase64, 'base64');

  // Импортируем закрытый ключ из PEM
  const privateKey = crypto.createPrivateKey(privateKeyPem);

  // Расшифровываем сообщение
  const decryptedMessage = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    encryptedMessage
  );

  return decryptedMessage.toString('utf8');
}

const privateKeyPem = fs.readFileSync(__dirname + '/private_key.pem', 'utf8');

function btoa2(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

const webServer = http.createServer(async (req, res) => {
    const query = url.parse(req.url, true).query;

    console.log('req:', req.url, query);

    const host = req.headers['x-host'] || query['x-host'];
    let authorization = req.headers['authorization'] || query['x-authorization'];
    const cb = req.headers['x-callback'] || query['x-callback'];

    /*
    try {
        const eauth = decryptMessage(privateKeyPem, authorization);
        console.log('==== eauth', eauth);
        const eauthJson = JSON.parse(eauth);
        if (Math.abs(eauthJson.time - Date.now()) < 5_000) {
            authorization = eauthJson.token;
        }
    } catch (error) {
        console.log('Proxy auth error:', error);
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(`{"error": "${String(error)}"}`);
        return;
    }
    */

    delete query['x-host'];
    delete query['x-authorization'];
    delete query['x-callback'];

    if (host) {
        const resp = await fetch(host + req.url, {
            headers: {
                'Authorization': authorization,
            },
        });

        try {
            const json = await resp.json();
            if (cb) {
                res.writeHead(200, { 'Content-Type': 'text/javascript' });
                res.end(`window['${cb}'](\`${btoa2(JSON.stringify(json))}\`)`);

                return;
            }

            res.end(JSON.stringify(json));
        } catch (error) {
            console.log('Proxy error:', error);
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(`{"error": "${String(error)}"}`);
            return;
        }

        return;
    }

    res.end('empty x-host');
});

webServer.listen(parseInt(PROXY_PORT));
console.log(`start proxy on ${parseInt(PROXY_PORT)} port at ${new Date()}`);
