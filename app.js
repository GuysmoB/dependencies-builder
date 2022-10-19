var fs = require("fs");
var readline = require("readline");
const stream = require("stream");
const { promisify } = require("util");
const { resolve } = require("path");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const foldersToExclude = [
  "@NGComponents",
  "@layouts",
  "rest/",
  "@components/utils/",
  "@components/texts/",
  "@components/tooltips/",
  "@components/buttons/",
  "@components/quests/",
  "@components/cells/",
  "@components/cards/",
  "@utils/",
  "@NGUtils/",
  "uuid",
  "web3-token",
  "@apollo/",
  "@graphql/",
  "strapi",
  "/Meta",
  "/Portal",
  "public/assets/",
  "highlightjs",
  ".styles",
  "/enums",
  ".enum",
  ".js",
  ".type",
  ".styles",
  "react",
  "next/image",
  "/axios",
  "/Flex",
  "next",
  "Main",
  "ethers",
];
const filename = "diagram.txt";
const folders = "foldersToParse";
let currentFile = "";
let allDependencies = [];
let allFiles = [];
let writeStream = fs.createWriteStream(filename, { flags: "a" });

/**
 * MAIN
 */
if (fs.existsSync(filename)) {
  fs.unlinkSync(filename);
}

(async () => {
  console.log("######## START ########");

  getFiles(folders)
    .then(async (files) => {
      for (const file of files) {
        if (file.split(".").pop() === "tsx") {
          let fileDependencies = [];
          currentFile = file.split("\\").pop().replace(".tsx", "");
          allFiles.push(currentFile);

          const input = fs.createReadStream(file);
          for await (const line of readLines({ input })) {
            extractDependencies_File(line, fileDependencies);
          }
          /* console.log(fileDependencies); */
          writeToFile(fileDependencies);
        }
      }

      [...new Set(allDependencies)].map((dependency) => {
        if (allFiles.indexOf(dependency) === -1) {
          writeStream.write(`${dependency}\n`);
        }
      });

      console.log("######## END ########");
    })
    .catch((e) => console.error(e));
})();

/**
 * ########## FONCTION ##########
 */
async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getFiles(res) : res;
    })
  );
  return files.reduce((a, f) => a.concat(f), []);
}

/**
 *
 */
function readLines({ input }) {
  const output = new stream.PassThrough({ objectMode: true });
  const rl = readline.createInterface({ input });
  rl.on("line", (line) => {
    output.write(line);
  });
  rl.on("close", () => {
    output.push(null);
  });
  return output;
}

/**
 *
 */
async function writeToFile(fileDependencies) {
  if (fileDependencies.length > 0) {
    writeStream.write(`${currentFile},"`);
    fileDependencies.forEach((item) => {
      writeStream.write(`${item}`);

      if (item !== fileDependencies[fileDependencies.length - 1]) {
        writeStream.write(`,`);
      }
    });
    writeStream.write(`"\n`);
  }
}

/**
 *
 */
function extractDependencies_File(line, _fileDependencies) {
  let _line = line;
  _line = _line.replaceAll("'", "")./* replaceAll(".", ""). */ replaceAll(";", "");
  const splitResult = _line.split(" ");

  if (splitResult.length > 2 && splitResult[0] === "import") {
    const lastElement = splitResult[splitResult.length - 1];

    let isExclude = false;
    foldersToExclude.map((folder) => {
      if (lastElement.includes(folder)) {
        isExclude = true;
      }
    });

    if (!isExclude) {
      /* console.log("lastElement", lastElement); */
      _fileDependencies.push(lastElement.split("/").pop());
      allDependencies.push(lastElement.split("/").pop());
    }
  }
}
