import { readdir, readFile } from "node:fs/promises";

let output = "";
const files = await readdir("./test/corpus");

for (const file of files) {
  if (!file.endsWith(".txt")) continue;

  output += `// ---- ${file} ----\n\n`;
  const f = await readFile(`./test/corpus/${file}`, { encoding: "utf8" });

  for (const [_1, sep, title, content] of f.matchAll(
    /^(={3,})\n(.+(?:\n.+)*)\n^\1\n{1,2}((?:.*\n)+?)\n*---/gm,
  )) {
    const split = title.split("\n");
    if (split.includes(":error") || split.includes(":skip")) continue;

    output += `// ${sep}\n`;
    output += split.map((line) => `// ${line}`).join("\n") + "\n";
    output += `// ${sep}\n`;
    output += content;
    output += "\n";
  }
}

console.log(output.trimEnd());
