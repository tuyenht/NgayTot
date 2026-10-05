/**
 * Tải phông Google về máy để tự chứa (PRD §3.3: không dùng phông bên thứ ba lúc chạy).
 * Chạy một lần: node fetch-fonts.mjs  → ghi assets/fonts/*.woff2 + css/fonts.css
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const HAN_TEXT = '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水吉命擇日宜忌空';
const sources = [
  { name: 'be-vietnam-pro', url: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap' },
  { name: 'noto-serif-sc-han', url: `https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600&display=swap&text=${encodeURIComponent(HAN_TEXT)}` },
];

mkdirSync(path.join(root, 'assets/fonts'), { recursive: true });
let outCss = `/* Phông tự chứa — sinh bởi công cụ fetch-fonts (Google Fonts, giấy phép SIL OFL 1.1). Không sửa tay. */\n`;
for (const src of sources) {
  const css = await (await fetch(src.url, { headers: { 'User-Agent': UA } })).text();
  const blocks = css.split('@font-face').slice(1);
  let i = 0;
  for (const raw of blocks) {
    const b = raw.replace(/\/\*[\s\S]*?\*\//g, ''); // bỏ chú thích subset của khối kế tiếp
    const url = /url\((https:[^)]+)\)/.exec(b)[1];
    const weight = /font-weight:\s*(\d+)/.exec(b)[1];
    const file = `${src.name}-${weight}-${i++}.woff2`;
    const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
    writeFileSync(path.join(root, 'assets/fonts', file), buf);
    const block = b.replace(/url\(https:[^)]+\)/, `url('../assets/fonts/${file}')`);
    outCss += `@font-face${block.trimEnd()}\n`;
    console.log(file, buf.length);
  }
}
writeFileSync(path.join(root, 'css/fonts.css'), outCss, 'utf8');
console.log('ok');
