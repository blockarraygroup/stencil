import * as d from '@declarations';
import { normalizePath } from '@utils';
import { sys } from '@sys';


export function generateServiceWorkerUrl(outputTarget: d.OutputTargetWww) {
  let swUrl = normalizePath(sys.path.relative(
    outputTarget.dir,
    outputTarget.serviceWorker.swDest
  ));

  if (swUrl.charAt(0) !== '/') {
    swUrl = '/' + swUrl;
  }

  swUrl = outputTarget.baseUrl + swUrl.substring(1);

  return swUrl;
}


export function appendSwScript(indexHtml: string, htmlToAppend: string) {
  const match = indexHtml.match(BODY_CLOSE_REG);

  if (match) {
    indexHtml = indexHtml.replace(match[0], `${htmlToAppend}\n${match[0]}`);
  } else {
    indexHtml += '\n' + htmlToAppend;
  }

  return indexHtml;
}


const BODY_CLOSE_REG = /<\/body>/i;
