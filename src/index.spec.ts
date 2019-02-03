import * as ts from 'typescript';
import { describe, it } from 'mocha';
import { expect } from 'chai';

import { create, ImportFileTransformOptions } from './index';

const printer = ts.createPrinter();

const cases: {
  title: string;
  src: string;
  tests: {
    when: string,
    options?: Partial<ImportFileTransformOptions['']>,
    expect: string;
  }[],
}[] = [ {
  title: 'single import *',
  src: `
  import * as _ from 'lodash';

  export function(a: number): number {
    return _.add(a, _.subtract(5, 10));
  }`,
  tests: [ {
    when: 'outputting default import',
    expect: [
      'import __add from "lodash/add";',
      'import __subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return __add(a, __subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting named import',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isNamed: true })
    },
    expect: [
      'import { add as __add } from "lodash/add";',
      'import { subtract as __subtract } from "lodash/subtract";',
      'export function (a: number): number {',
      '    return __add(a, __subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting star imports',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isStar: true })
    },
    expect: [
      'import * as __add from "lodash/add";',
      'import * as __subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return __add(a, __subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  } ]
}, {
  title: 'named imports',
  src: `
  import { add, subtract } from 'lodash';

  export function(a: number): number {
    return add(a, subtract(5, 10));
  }`,
  tests: [ {
    when: 'outputting default import',
    expect: [
      'import add from "lodash/add";',
      'import subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return add(a, subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting named import',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isNamed: true })
    },
    expect: [
      'import { add } from "lodash/add";',
      'import { subtract } from "lodash/subtract";',
      'export function (a: number): number {',
      '    return add(a, subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting star imports',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isStar: true })
    },
    expect: [
      'import * as add from "lodash/add";',
      'import * as subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return add(a, subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  } ]
}, {
  title: 'named and default imports',
  src: `
  import _, { add } from 'lodash';

  export function(a: number): number {
    return _.add(add(a, _.subtract(5, 10)), 5);
  }`,
  tests: [ {
    when: 'outputting default import',
    expect: [
      'import __subtract from "lodash/subtract";',
      'import add from "lodash/add";',
      'export function (a: number): number {',
      '    return add(add(a, __subtract(5, 10)), 5);',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting named import',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isNamed: true })
    },
    expect: [
      'import { subtract as __subtract } from "lodash/subtract";',
      'import { add } from "lodash/add";',
      'export function (a: number): number {',
      '    return add(add(a, __subtract(5, 10)), 5);',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting star imports',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isStar: true })
    },
    expect: [
      'import * as __subtract from "lodash/subtract";',
      'import * as add from "lodash/add";',
      'export function (a: number): number {',
      '    return add(add(a, __subtract(5, 10)), 5);',
      '}',
      ''
    ].join('\n')
  } ]
}, {
  title: 'default import',
  src: `
  import _ from 'lodash';

  export function(a: number): number {
    return _.add(a, _.subtract(5, 10));
  }`,
  tests: [ {
    when: 'outputting default import',
    expect: [
      'import __add from "lodash/add";',
      'import __subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return __add(a, __subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting named import',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isNamed: true })
    },
    expect: [
      'import { add as __add } from "lodash/add";',
      'import { subtract as __subtract } from "lodash/subtract";',
      'export function (a: number): number {',
      '    return __add(a, __subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting star imports',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isStar: true })
    },
    expect: [
      'import * as __add from "lodash/add";',
      'import * as __subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return __add(a, __subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  } ]
}, {
  title: 'named alias imports',
  src: `
  import { add as _add, subtract as _subtract } from 'lodash';

  export function(a: number): number {
    return _add(a, _subtract(5, 10));
  }`,
  tests: [ {
    when: 'outputting default import',
    expect: [
      'import _add from "lodash/add";',
      'import _subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return _add(a, _subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting named import',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isNamed: true })
    },
    expect: [
      'import { add as _add } from "lodash/add";',
      'import { subtract as _subtract } from "lodash/subtract";',
      'export function (a: number): number {',
      '    return _add(a, _subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting star imports',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isStar: true })
    },
    expect: [
      'import * as _add from "lodash/add";',
      'import * as _subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return _add(a, _subtract(5, 10));',
      '}',
      ''
    ].join('\n')
  } ]
}, {
  title: 'named alias imports with defaults',
  src: `
  import _, { add as _add, subtract as _subtract } from 'lodash';

  export function(a: number): number {
    return _.add(_add(a, _subtract(5, 10)), 5);
  }`,
  tests: [ {
    when: 'outputting default import',
    expect: [
      'import _add from "lodash/add";',
      'import _subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return _add(_add(a, _subtract(5, 10)), 5);',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting named import',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isNamed: true })
    },
    expect: [
      'import { add as _add } from "lodash/add";',
      'import { subtract as _subtract } from "lodash/subtract";',
      'export function (a: number): number {',
      '    return _add(_add(a, _subtract(5, 10)), 5);',
      '}',
      ''
    ].join('\n')
  }, {
    when: 'outputting star imports',
    options: {
      writePath: path => ({ path: `lodash/${path}`, isStar: true })
    },
    expect: [
      'import * as _add from "lodash/add";',
      'import * as _subtract from "lodash/subtract";',
      'export function (a: number): number {',
      '    return _add(_add(a, _subtract(5, 10)), 5);',
      '}',
      ''
    ].join('\n')
  } ]
} ]

cases.forEach(t => {
  describe(`when ${t.title}`, () => {
    t.tests.forEach(test => {
      describe(`when ${test.when}`, () => {
        it('should emit the correct result', () => {
          const transformer = create({
            lodash: {

              match: /^lodash$/,
              writeIdentifier: prop => `__${prop}`,
              writePath: path => ({ path: `lodash/${path}` }),
              ...(test.options || {})
            }
          })
          const sourceFile = ts.createSourceFile("test.ts", t.src, ts.ScriptTarget.Latest);
          const result = ts.transform(sourceFile, [
            transformer
          ])
            .transformed[0];
          const actual = printer.printFile(result);

          console.log(test.expect);
          console.log(actual);

          expect(actual).to.equal(test.expect);
        });
      });
    });
  });
});
