import * as tsModule from "../node_modules/typescript/lib/tsserverlibrary";

import * as tslint from "tslint";
import Rules from "./rules";

function init(modules: { typescript: typeof tsModule }) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    info.project.projectService.logger.info("tslint-language-service loaded");

    // Set up decorator
    const proxy = Object.create(null) as ts.LanguageService;
    const { languageService } = info;
    for (const k in languageService) {
      (proxy as any)[k] = function() {
        return (languageService as any)[k].apply(languageService, arguments);
      };
    }

    proxy.getSemanticDiagnostics = (fileName: string) => {
      let prior = languageService.getSemanticDiagnostics(fileName);
      if (prior === undefined) {
        prior = [];
      }

      const program = languageService.getProgram();
      const sourceFile = program.getSourceFile(fileName);

      Rules.forEach(Rule => {
        const rule = new Rule({
          disabledIntervals: [],
          ruleArguments: [],
          ruleName: "",
          ruleSeverity: "error",
        }) as any;

        const failures: any[] = (rule as tslint.Rules.TypedRule).applyWithProgram
          ? rule.applyWithProgram(sourceFile as any, program as any)
          : rule.apply(sourceFile as any);

        prior.push(
          ...failures.map(failure => ({
            file: sourceFile,
            start: failure.getStartPosition().getPosition(),
            length: failure.getEndPosition().getPosition() - failure.getStartPosition().getPosition(),
            messageText: failure.getFailure(),
            category: ts.DiagnosticCategory.Error,
            source: "SonarTS",
            code: 1,
          })),
        );
      });

      return prior;
    };

    return proxy;
  }

  return { create };
}

export = init;
