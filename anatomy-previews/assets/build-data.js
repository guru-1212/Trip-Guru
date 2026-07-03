// Converts the MIT-licensed body-highlighter TS assets into a single JS data file.
const fs = require('fs');
const path = require('path');

function loadTs(file, exportName) {
  let src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  src = src.replace(/import[^;]+;/g, '');
  src = src.replace(new RegExp(`export const ${exportName}\\s*:\\s*BodyPart\\[\\]\\s*=`), 'module.exports =');
  const mod = { exports: {} };
  new Function('module', 'exports', src)(mod, mod.exports);
  return mod.exports;
}

const front = loadTs('bodyFront.ts', 'bodyFront');
const back = loadTs('bodyBack.ts', 'bodyBack');

const simplify = (arr) =>
  arr.map((p) => ({
    slug: p.slug,
    paths: [...(p.path?.left ?? []), ...(p.path?.right ?? []), ...(p.path?.common ?? [])],
  }));

const out =
  '// Anatomy path data from react-native-body-highlighter (MIT License, (c) 2022 ELABBASSI Hicham)\n' +
  '// https://github.com/HichamELBSI/react-native-body-highlighter\n' +
  'const BODY_DATA = ' +
  JSON.stringify({ front: simplify(front), back: simplify(back) }) +
  ';\n';

fs.writeFileSync(path.join(__dirname, 'body-data.js'), out);
console.log('front parts:', front.length, '| back parts:', back.length);
console.log('bytes:', out.length);
