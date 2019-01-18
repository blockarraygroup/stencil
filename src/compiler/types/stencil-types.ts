import * as d from '@declarations';
import { normalizePath } from '@utils';
import { sys } from '@sys';


export function updateStencilTypesImports(config: d.Config, typesDir: string, dtsFilePath: string, dtsContent: string) {
  const dir = sys.path.dirname(dtsFilePath);
  const relPath = sys.path.relative(dir, typesDir);

  let coreDtsPath = normalizePath(sys.path.join(relPath, CORE_FILENAME));
  if (!coreDtsPath.startsWith('.')) {
    coreDtsPath = `./${coreDtsPath}`;
  }

  if (dtsContent.includes('JSX')) {
    dtsContent = `import '${coreDtsPath}';\n${dtsContent}`;
  }

  if (dtsContent.includes('@stencil/core')) {
    dtsContent = dtsContent.replace(/\@stencil\/core/g, coreDtsPath);
  }

  return dtsContent;
}


export async function copyStencilCoreDts(config: d.Config, compilerCtx: d.CompilerCtx) {
  const typesOutputTargets = (config.outputTargets as d.OutputTargetDist[]).filter(o => o.typesDir);

  await Promise.all(typesOutputTargets.map(async typesOutputTarget => {
    await copyStencilCoreDtsOutput(config, compilerCtx, typesOutputTarget);
  }));
}


async function copyStencilCoreDtsOutput(config: d.Config, compilerCtx: d.CompilerCtx, outputTarget: d.OutputTargetDist) {
  const srcDts = await sys.getClientCoreFile({
   staticName: 'declarations/stencil.core.d.ts'
  });

  const coreDtsFilePath = normalizePath(sys.path.join(outputTarget.typesDir, CORE_DTS));
  await compilerCtx.fs.writeFile(coreDtsFilePath, srcDts);
}


const CORE_FILENAME = `stencil.core`;
const CORE_DTS = `${CORE_FILENAME}.d.ts`;
