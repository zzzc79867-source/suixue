// 内容与计划引擎冒烟校验：npm run check
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

const idx = JSON.parse(readFileSync(join(root, 'content/index.json'), 'utf8'));
const TYPE_SET = new Set(['concept', 'question', 'word', 'example']);

for (const s of idx.subjects) {
  const d = JSON.parse(readFileSync(join(root, 'content/subjects', s.file), 'utf8'));
  if (d.id !== s.id) errors.push(s.id + ': 索引 id 不匹配');
  const ids = new Set();
  for (const u of d.units || []) {
    for (const c of u.cards || []) {
      if (ids.has(c.id)) errors.push(s.id + ': 卡片 id 重复 ' + c.id);
      ids.add(c.id);
      if (!TYPE_SET.has(c.type)) errors.push(s.id + ': 未知类型 ' + c.type + ' (' + c.id + ')');
      if (c.type === 'concept' && (!c.title || !c.body)) errors.push(s.id + ': 概念卡缺 title/body ' + c.id);
      if (c.type === 'example' && (!c.body || !c.solution)) errors.push(s.id + ': 例题卡缺 body/solution ' + c.id);
      if (c.type === 'question' && (typeof c.answer !== 'number' || !Array.isArray(c.options) || c.options.length < 2)) errors.push(s.id + ': 选择题缺 options/answer ' + c.id);
      if (c.type === 'word' && (!c.front || !c.back)) errors.push(s.id + ': 单词卡缺 front/back ' + c.id);
    }
  }
  console.log(s.id + ': ' + (d.units || []).length + ' 单元 / ' + ids.size + ' 卡');
}

const { buildDailyQueue } = await import(pathToFileURL(join(root, 'js/planning.js')).href);
const subjects = idx.subjects.map(s => JSON.parse(readFileSync(join(root, 'content/subjects', s.file), 'utf8')));
const q = buildDailyQueue(subjects);
if (!q.teach.length && !q.practice.length) errors.push('新用户队列为空');
console.log('今日队列: 新课 ' + q.teach.length + ' + 练习 ' + q.practice.length);

if (errors.length) {
  console.error('FAIL\n' + errors.join('\n'));
  process.exit(1);
}
console.log('PASS: 内容结构与计划引擎校验通过');
