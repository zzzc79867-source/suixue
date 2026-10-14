import { connect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

const [owner, repo] = ['zzzc79867-source', 'suixue'];

function requestThroughProxy(path, token = '') {
  return new Promise((resolve, reject) => {
    const socket = connect(7897, '127.0.0.1', () => {
      socket.write('CONNECT api.github.com:443 HTTP/1.1\r\nHost: api.github.com:443\r\n\r\n');
    });
    socket.once('error', reject);
    socket.once('data', function onData(chunk) {
      if (!chunk.toString().includes(' 200 ')) return reject(new Error('Proxy CONNECT failed'));
      socket.removeListener('data', onData);
      const secure = tlsConnect({ socket, servername: 'api.github.com', rejectUnauthorized: false }, () => {
        secure.write([
          `GET ${path} HTTP/1.1`,
          'Host: api.github.com',
          'User-Agent: suixue-pages-check',
          'Accept: application/vnd.github+json',
          token ? `Authorization: Bearer ${token}` : '',
          'Connection: close',
          '', ''
        ].filter(Boolean).join('\r\n'));
      });
      secure.once('error', reject);
      let raw = '';
      secure.on('data', chunk => raw += chunk.toString());
      secure.on('end', () => {
        const split = raw.indexOf('\r\n\r\n');
        resolve({ status: Number(raw.match(/^HTTP\/\S+ (\d+)/)?.[1] || 0), body: raw.slice(split + 4) });
      });
    });
  });
}

const { status, body } = await requestThroughProxy(`/repos/${owner}/${repo}/pages`);
console.log('HTTP', status);
try { console.log(JSON.parse(body)); } catch { console.log(body); }
