typescript-transform-imports
============================

A typescript transform for transforming import declarations.

Install
-------

`npm install --save-dev typescript-transform-imports`

Usage
-----

### Uses

This can transform imports to become better tree shakable. Take lodash for example.

```typescript
// This will import all of lodash... Looks nice, but it's pretty large in size.
import * as _ from 'lodash';

const value = _.add(10, _.subtract(10, 5));
```

This will be transformed to this.

```typescript
// Only import the parts we care about.
import __add from 'lodash/add';
import __subtract from 'lodash/subtract';

const value = __add(10, __subtract(10, 5));
```

### Creating a transformer

```typescript
import { create } from 'typescript-transform-imports';

// This is the transform function that can be passed directly to the
// typescript API or using a build process that supports typescript
// transforms.
const importTransformer = create({
  lodash: {
    match: /^lodash$/,
    writePath: prop => ({ path: `lodash/${prop}` }), // Optional
    writeIdentifier: prop => `__${prop}` // Optional
  },
  lodashFp: {
    match: /^lodash\/fp$/,
    writePath: prop => ({ path: `lodash/fp/${prop}` }), // Optional
    writeIdentifier: prop => `__fp_${prop}` // Optional
  }
});
```

#### Named Imports

Named imports will also be transformed

```typescript
import { add, subtract } from 'lodash';

const value = add(10, subtract(10, 5));

// This will be transformed to this:

import add from 'lodash/add';
import subtract from 'lodash/subtract';

const value = add(10, subtract(10, 5));
```

 ### Customization

 The written imports can be customized to write star, named or default exports.

```typescript
import { create } from 'typescript-transform-imports';

// This is the transform function that can be passed directly to the
// typescript API or using a build process that supports typescript
// transforms.
const importTransformer = create({
  lodash: {
    // Match can also take a function that receives the path and import specifier node.
    match: (path, node) => path === 'lodash',
    // Gets the path and import type for single usage. 'isStar' can be used to write a star import
    // isNamed -> import { add as __add } from 'lodash/add';
    // isStar -> import * as __add from 'lodash/add';
    // default -> import __add from 'lodash/add';
    writePath: prop => ({ path: `lodash/${prop}`, isNamed: true }),
    // Gets the identifier to write when used from a star import.
    // _.add() would write to __add__()
    writeIdentifier: prop => `__${prop}__`
  }
});
```

### Webpack Usage

This can be used easily with ts-loader by add it to your webpack config.

```typescript
import { create as createImportTransformer } from 'typescript-transform-imports';

const importsTransformer = createImportTransformer({
  lodash: {
    match: /^lodash$/
  }
});

const config = {
  module: {
    rules: [ {
      test: /\.tsx?$/,
      loader: 'ts-loader',
      options: {
        getCustomTransformers: () => ({ before: [ importsTransformer ] })
      }
    } ]
  }
};

```