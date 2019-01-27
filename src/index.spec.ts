import * as ts from "typescript"
import { create } from './index';

const transformer = create({
  lodash: {
    writeIdentifier: prop => `__${prop}`,
    writePath: prop => ({ path: `lodash/${prop}`, isNamed: true })
  }
});
const printer = ts.createPrinter();

const cases = [ {
  title: 'single import *',
  src: `
  import * as _ from 'lodash';

  export function(a: number): number {
    return _.add(a, _.subtract(5, 10));
  }
  `,
  dest: `
  import add from 'lodash/add';
  import subtract from 'lodash/subtract';

  export function(a: number): number {
    return __add(a, __subtract(5, 10));
  }
  `
} ];


cases.forEach(t => {
  const sourceFile = ts.createSourceFile("test.ts", t.src, ts.ScriptTarget.Latest);
  const result = ts.transform(sourceFile, [
    transformer
  ])
    .transformed[0];

  console.log(printer.printFile(result));
});
