import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { collectPublication } from './publication.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = `${root}content/publication.json`;
let state;
try { state = JSON.parse(await readFile(file, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; state = { version: 1, reports: {}, ledger: [] }; }
const result = await collectPublication(state);
// 세 기간이 모두 정상 처리되어야 저장합니다. 오류 시 기존 게시물을 유지합니다.
if (result.changed) {
  await mkdir(`${root}content`, { recursive: true });
  await writeFile(`${file}.tmp`, `${JSON.stringify(result.state, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
}
console.log(result.changed ? '보고서·사용법 분석·중복 판정을 저장했습니다.' : '이미 처리한 기간입니다. 추가 발행하지 않았습니다.');
