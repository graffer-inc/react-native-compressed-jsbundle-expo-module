const fs = require("fs");
const { globSync } = require("glob");

const addCompressScriptToBuildPhase = (projectFile) => {
  let contents = fs.readFileSync(projectFile, "utf8");
  const newScriptLine =
    "../node_modules/react-native-compressed-jsbundle/tool/compress-xcode.sh";
  if (contents.includes(newScriptLine)) {
    return;
  }
  contents = contents.replace(
    /(shellScript\s*=\s*".+?'\/scripts\/react-native-xcode\.sh'.+?)";[\r\n]/gims,
    `$1\\n${newScriptLine}";\n`
  );
  fs.writeFileSync(projectFile, contents, "utf8");
};

const isTargetProjectFile = (projectFile) => {
  const contents = fs.readFileSync(projectFile, "utf8");
  const match = contents.match(/\/scripts\/react-native-xcode\.sh/g);
  if (match?.length != 2) {
    return false;
  }
  return true;
};

const watchProjectFile = () => {
  const projectFiles = globSync("./ios/**/project.pbxproj");
  if (!projectFiles.length) {
    return;
  }
  target = projectFiles.filter((file) => !file.match(/ios\/Pods\//)).shift();
  if (isTargetProjectFile(target)) {
    console.log("adding compress script to build phase");
    addCompressScriptToBuildPhase(target);
    return;
  }
  const watcher = fs.watch(target, () => {
    if (!isTargetProjectFile(target)) {
      return;
    }
    console.log("adding compress script to build phase");
    addCompressScriptToBuildPhase(target);
    watcher.close();
  });
};

const modifyAppDelegateFile = (appDelegateFile) => {
  let contents = fs.readFileSync(appDelegateFile, "utf8");
  const importStatement = `
#import <react-native-compressed-jsbundle/IMOCompressedBundleLoader.h>
`;
  const methodImplementation = `
- (void)loadSourceForBridge:(RCTBridge *)bridge onProgress:(RCTSourceLoadProgressBlock)onProgress onComplete:(RCTSourceLoadBlock)loadCallback {
[IMOCompressedBundleLoader loadSourceForBridge:bridge bridgeDelegate:self onProgress:onProgress onComplete:loadCallback];
}
`;
  if (contents.includes(importStatement)) {
    return;
  }
  contents = contents
    .replace(/#import "AppDelegate.h"/, `$&${importStatement}`)
    .replace(/\@end/, `${methodImplementation}$&`);
  fs.writeFileSync(appDelegateFile, contents, "utf8");
};

const watchAppDelegateFile = () => {
  if (fs.existsSync("ios")) {
    console.log("modifying app delegate files");
    const appDelegateFiles = globSync("./ios/**/AppDelegate.{m,mm}");
    appDelegateFiles.forEach(modifyAppDelegateFile);
    return;
  }
  const fileRegex = /ios\/.+?\/AppDelegate\.(m|mm)$/;
  let count = 2;
  console.log("watching app delegate file");
  const watcher = fs.watch(
    process.cwd(),
    {
      recursive: true,
    },
    (_, filename) => {
      if (!fileRegex.test(filename)) {
        return;
      }
      console.log("modifying app delegate file", filename);
      modifyAppDelegateFile(filename);
      if (--count) {
        return;
      }
      console.log("closing watcher");
      watcher.close();
    }
  );
};

module.exports = function withCompressedJsBundle(config, props = {}) {
  watchAppDelegateFile();
  watchProjectFile();
  return config;
};
