const { withAppDelegate, withXcodeProject } = require("@expo/config-plugins");

function addCompressScriptToBuildPhase(project) {
  const shellScriptBuildPhases = project.pbxItemByComment(
    "Bundle React Native code and images",
    "PBXShellScriptBuildPhase"
  );

  if (!shellScriptBuildPhases) {
    throw new Error(
      'Could not find "Bundle React Native code and images" build phase'
    );
  }

  shellScriptBuildPhases.forEach((phase) => {
    const buildPhase = phase.value;
    const newScriptLine = `../node_modules/react-native-compressed-jsbundle/tool/compress-xcode.sh`;

    if (!buildPhase.shellScript.includes(newScriptLine)) {
      buildPhase.shellScript = buildPhase.shellScript.replace(
        /"$/,
        `\\n${newScriptLine}\\n"`
      );
    }
  });
}

module.exports = function withCompressedJsBundle(config) {
  config = withAppDelegate(config, (config) => {
    if (config.modResults.language === "objc") {
      let contents = config.modResults.contents;

      const importStatement = `#import <react-native-compressed-jsbundle/IMOCompressedBundleLoader.h>`;
      if (!contents.includes(importStatement)) {
        contents = contents.replace(
          /#import "AppDelegate.h"/,
          `#import "AppDelegate.h"\n${importStatement}`
        );
      }

      const methodImplementation = `
- (void)loadSourceForBridge:(RCTBridge *)bridge onProgress:(RCTSourceLoadProgressBlock)onProgress onComplete:(RCTSourceLoadBlock)loadCallback {
  [IMOCompressedBundleLoader loadSourceForBridge:bridge bridgeDelegate:self onProgress:onProgress onComplete:loadCallback];
}
`;
      if (!contents.includes("loadSourceForBridge")) {
        contents = contents.replace(/\@end/, `${methodImplementation}\n@end`);
      }

      config.modResults.contents = contents;
    } else {
      throw new Error("Cannot modify AppDelegate of non-objc project.");
    }
    return config;
  });

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;

    addCompressScriptToBuildPhase(project);
    return config;
  });

  return config;
};
