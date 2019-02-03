import * as ts from 'typescript';

export interface ImportFileTransformOptions {
  [key: string]: {
    match: RegExp | ((path: string, node: ts.ImportClause) => boolean);
    writeIdentifier?: (prop: string) => string;
    writePath?: (prop: string) => { path: string, isNamed?: boolean; isStar?: boolean; };
  };
}

export function create(options: ImportFileTransformOptions = {}): ts.TransformerFactory<ts.SourceFile> {
  Object.keys(options).forEach(key => {
    options[key] = {
      writePath: (prop: string) => ({ path: `${key}/${prop}`, isNamed: true }),
      writeIdentifier: prop => `__${key}_${prop}`,
      ...options[key]
    };
  })

  return (context: ts.TransformationContext) => sourceNode => new ImportFileTransformer(context, sourceNode, options).transform();
}

export class ImportFileTransformer {
  constructor(
    private context: ts.TransformationContext,
    private sourceNode: ts.SourceFile,
    private options: ImportFileTransformOptions
  ) {}

  transform(): ts.SourceFile{
    const usageTransformer = new ImportUsageTransformer(this.context, this.sourceNode, this.options);
    const sourceFile = usageTransformer.transform();

    return ts.visitNode(sourceFile, node => this.visitor(node, usageTransformer));
  }

  private visitor(node: ts.Node, usageTransformer: ImportUsageTransformer): ts.VisitResult<ts.Node> {
    if (ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier)
      && usageTransformer.hasMatch(node.moduleSpecifier.text)
    ) {
      const packageName = node.moduleSpecifier.text;
      const pack = usageTransformer.getMatch(packageName);
      const { writePath, writeIdentifier } = this.options[pack.matcherName]!;

      return [
        ...pack.usages.map(prop => {
          const pathDef = writePath!(prop);

          return ts.createImportDeclaration(
            undefined,
            undefined,
            this.getImportClause(pathDef, prop, writeIdentifier!, true),
            ts.createStringLiteral(pathDef.path));
        }),
        ...pack.namedImports.map(specifier => {
          const alias = specifier.propertyName && specifier.name.text;
          const prop = specifier.propertyName
            ? specifier.propertyName.text
            : specifier.name.text;
          const pathDef = writePath!(prop);

          return ts.createImportDeclaration(
            undefined,
            undefined,
            this.getImportClause(pathDef, prop, () => alias || prop, Boolean(alias)),
            ts.createStringLiteral(pathDef.path));
        })
      ];
    }

    return ts.visitEachChild(node, n => this.visitor(n, usageTransformer), this.context);
  }

  private getImportClause(
    pathDef: ReturnType<NonNullable<ImportFileTransformOptions['']['writePath']>>,
    prop: string,
    writeIdentifier: NonNullable<ImportFileTransformOptions['']['writeIdentifier']>,
    alias: boolean = false
  ): ts.ImportClause {
    if (pathDef.isNamed) {
      return ts.createImportClause(undefined,
        ts.createNamedImports([
          ts.createImportSpecifier(
            alias ? ts.createIdentifier(prop) : undefined,
            ts.createIdentifier(writeIdentifier(prop)))
        ]));
    } else if (pathDef.isStar) {
      return ts.createImportClause(undefined,
        ts.createNamespaceImport(
          ts.createIdentifier(
            writeIdentifier(prop))));
    } else {
      return ts.createImportClause(ts.createIdentifier(writeIdentifier(prop)), undefined);
    }
  }

  static isMatch(matcher: RegExp | ((path: string, node: ts.ImportClause) => boolean), path: string, node: ts.ImportClause): boolean {
    return matcher instanceof RegExp ? matcher.test(path) : matcher(path, node);
  }
}

export class ImportUsageTransformer {
  private matches: {
    [key: string]: {
      matcherName: string;
      importAlias: string;
      usages: string[];
      namedImports: ts.ImportSpecifier[];
    }
  } = {};

  private packageAliasToName: { [key: string]: string } = {};
  private matchNames: string[] = [];
  private importAliasNames: string[] = [];

  constructor(
    private context: ts.TransformationContext,
    private sourceNode: ts.SourceFile,
    private options: ImportFileTransformOptions
  ) {}

  transform(): ts.SourceFile {
    return ts.visitNode(this.sourceNode, node => this.visitor(node));
  }

  getMatch(name: string): ImportUsageTransformer['matches'][''] {
    return this.matches[name];
  }

  getMatchByAlias(alias: string): ImportUsageTransformer['matches'][''] {
    return this.matches[this.packageAliasToName[alias]];
  }

  hasMatch(name: string): boolean {
    return this.matchNames.indexOf(name) !== -1;
  }

  private setImportAliasForImport(name: string, as: string): void {
    this.matches[name].importAlias = as;
    this.importAliasNames.push(as);
    this.packageAliasToName[as] = name;
  }

  private isImportAlias(name: string): boolean {
    return this.importAliasNames.indexOf(name) !== -1;
  }

  private initMatch(name: string, matcherName: string): void {
    this.matchNames.push(name);
    this.matches[name] = {
      matcherName,
      usages: [],
      importAlias: '',
      namedImports: [] as ts.ImportSpecifier[]
    };
  }

  private visitor(node: ts.Node): ts.VisitResult<ts.Node> {
    if (ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier)
      && node.importClause
    ) {
      for (const name of Object.keys(this.options)) {
        const entry = this.options[name];

        if (ImportFileTransformer.isMatch(entry.match, node.moduleSpecifier.text, node.importClause!)) {
          this.initMatch(node.moduleSpecifier.text, name);

          if (node.importClause.namedBindings) {
            if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              this.setImportAliasForImport(node.moduleSpecifier.text, node.importClause.namedBindings.name.text);
            } else if (ts.isNamedImports(node.importClause.namedBindings)) {
              this.matches[node.moduleSpecifier.text].namedImports = [ ...(node.importClause.namedBindings as ts.NamedImports).elements ];
            }
          }

          if (node.importClause.name) {
            this.setImportAliasForImport(node.moduleSpecifier.text, node.importClause.name.text);
          }

          break;
        }
      }
    }

    if (ts.isPropertyAccessExpression(node)
      && ts.isIdentifier(node.expression)
      && this.isImportAlias(node.expression.text)
    ) {
      return this.addUsage(node.expression.text, node.name.text);
    }

    return ts.visitEachChild(node, n => this.visitor(n), this.context);
  }

  private addUsage(matchName: string, name: string): ts.Identifier {
    const pack = this.getMatchByAlias(matchName);
    const match = this.options[pack.matcherName];
    let namedImport: ts.ImportSpecifier | null = null;
    let namedImportName: string = '';

    for (const imp of pack.namedImports) {
      const impName = imp.propertyName
        ? imp.propertyName.text
        : imp.name.text;

      if (impName === name) {
        namedImport = imp;
        namedImportName = imp.name.text;

        break;
      }
    }

    if (pack.usages.indexOf(name) === -1 && !namedImport) {
      pack.usages.push(name);
    }

    return ts.createIdentifier(namedImportName ? namedImportName : match.writeIdentifier!(name));
  }
}