import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validatePublication } from './contracts.mjs';
import { documentMaxAgeMs } from './freshness.mjs';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const state = JSON.parse(await readFile(`${root}content/publication.json`, 'utf8'));
validatePublication(state);
await rm(`${root}dist`, { recursive: true, force: true });
await mkdir(`${root}dist`, { recursive: true });
let html = await readFile(`${root}web/index.html`, 'utf8');
for (const file of ['style.css', 'app.js']) {
  const content = await readFile(`${root}web/${file}`);
  const version = createHash('sha256').update(content).digest('hex').slice(0, 12);
  html = html.replace(`./${file}`, `./${file}?v=${version}`);
  await copyFile(`${root}web/${file}`, `${root}dist/${file}`);
}
// 보고서가 갱신돼도 이전 스크립트 캐시가 섞이지 않도록 파일 내용으로 버전을 붙입니다.
await writeFile(`${root}dist/index.html`, html);
// 발행 장부는 브라우저에 배포하지 않습니다.
await writeFile(`${root}dist/reports.json`, JSON.stringify({ reports: state.reports, documentMaxAgeMs }));
await writeFile(`${root}dist/.nojekyll`, '');
console.log('정적 사이트 빌드 완료: dist/');
