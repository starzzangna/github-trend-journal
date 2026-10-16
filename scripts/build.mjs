import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const state = JSON.parse(await readFile(`${root}content/publication.json`, 'utf8'));
await rm(`${root}dist`, { recursive: true, force: true });
await mkdir(`${root}dist`, { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js']) await copyFile(`${root}web/${file}`, `${root}dist/${file}`);
// 발행 장부는 브라우저에 배포하지 않습니다.
await writeFile(`${root}dist/reports.json`, JSON.stringify({ reports: state.reports }));
await writeFile(`${root}dist/.nojekyll`, '');
console.log('정적 사이트 빌드 완료: dist/');
