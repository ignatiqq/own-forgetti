const babel = require("@babel/core");
const simpleForget = require("../src/core");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { presets } = require("../src/preset");

async function compile(code) {
  const result = await babel.transformAsync(code, {
    plugins: [[simpleForget, {preset: presets.react}]],
    parserOpts: {
      plugins: ["jsx"],
    },
  });

  return result?.code ?? "";
}

(async function() {
    console.log(await compile(await readFile(path.resolve(__dirname, "./input.js"), "utf-8")));
})();