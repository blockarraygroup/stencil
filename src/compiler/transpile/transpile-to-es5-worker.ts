import * as d from '@declarations';
import { loadTypeScriptDiagnostics } from '@utils';
import ts from 'typescript';


export async function transpileToEs5Worker(cwd: string, input: string, inlineHelpers: boolean) {
  const config: d.Config = {
    cwd: cwd
  };

  const results: d.TranspileResults = {
    code: input,
    diagnostics: []
  };

  const transpileOpts: ts.TranspileOptions = {
    compilerOptions: {
      sourceMap: false,
      allowJs: true,
      declaration: false,
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.ESNext,
      removeComments: false,
      isolatedModules: true,
      skipLibCheck: true,
      noEmitHelpers: !inlineHelpers,
      importHelpers: !inlineHelpers
    }
  };

  const tsResults = ts.transpileModule(input, transpileOpts);

  loadTypeScriptDiagnostics(config, results.diagnostics, tsResults.diagnostics);

  if (results.diagnostics.length === 0) {
    results.code = tsResults.outputText;
  }

  return results;
}
