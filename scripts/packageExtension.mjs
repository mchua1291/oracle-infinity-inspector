import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const releaseDirectory = join(root, 'release');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const output = join(releaseDirectory, `oracle-infinity-inspector-v${packageJson.version}-edge.zip`);

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
  };
}

async function filesUnder(directory) {
  const entries = [];
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const metadata = await stat(path);
    if (metadata.isDirectory()) entries.push(...(await filesUnder(path)));
    else if (metadata.isFile()) entries.push({ path, metadata });
  }
  return entries;
}

function zipEntry(name, data, modifiedAt, offset) {
  const filename = Buffer.from(name, 'utf8');
  const checksum = crc32(data);
  const { date, time } = dosTimestamp(modifiedAt);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(date, 14);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(filename.length, 28);
  central.writeUInt32LE(offset, 42);
  return {
    local: Buffer.concat([local, filename, data]),
    central: Buffer.concat([central, filename]),
  };
}

const sourceFiles = (await filesUnder(dist)).sort((left, right) =>
  left.path.localeCompare(right.path),
);
const installText = Buffer.from(
  [
    `Oracle Infinity Inspector v${packageJson.version}`,
    '',
    '1. Extract this ZIP to a permanent folder.',
    '2. Open edge://extensions in Microsoft Edge.',
    '3. Enable Developer mode.',
    '4. Select Load unpacked and choose the extracted folder containing manifest.json.',
    '5. Open DevTools on an authorized test page and select the Oracle Infinity panel.',
    '',
    'The extension is local-only and does not update automatically.',
  ].join('\r\n'),
  'utf8',
);
const files = [
  ...sourceFiles.map(({ path, metadata }) => ({
    name: relative(dist, path).split(sep).join('/'),
    data: readFile(path),
    modifiedAt: metadata.mtime,
  })),
  { name: 'INSTALLATION.txt', data: Promise.resolve(installText), modifiedAt: new Date() },
];

const localParts = [];
const centralParts = [];
let offset = 0;
for (const file of files) {
  const entry = zipEntry(file.name, await file.data, file.modifiedAt, offset);
  localParts.push(entry.local);
  centralParts.push(entry.central);
  offset += entry.local.length;
}
const centralDirectory = Buffer.concat(centralParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDirectory.length, 12);
end.writeUInt32LE(offset, 16);

await mkdir(dirname(output), { recursive: true });
const archive = Buffer.concat([...localParts, centralDirectory, end]);
await writeFile(output, archive);
const checksum = createHash('sha256').update(archive).digest('hex');
await writeFile(`${output}.sha256`, `${checksum}  ${output.split(sep).at(-1)}\n`, 'utf8');
console.log(`Created ${relative(root, output)} with ${files.length} files and a SHA-256 checksum.`);
