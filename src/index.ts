import * as ts from 'typescript';

export interface StarImportFileTransformOptions {
  [key: string]: {
    writeIdentifier?: (prop: string) => string;
    writePath?: (prop: string) => { path: string, isNamed: boolean; };
  };
}

export function create(options: StarImportFileTransformOptions = {}): ts.TransformerFactory<ts.SourceFile> {
  Object.keys(options).forEach(key => {
    options[key] = {
      writePath: (prop: string) => ({ path: `${key}/${prop}`, isNamed: true }),
      writeIdentifier: prop => `__${key}_${prop}`,
      ...options[key]
    };
  })

  return (context: ts.TransformationContext) => sourceNode => new StarImportFileTransformer(context, sourceNode, options).transform();
}

export class StarImportFileTransformer {
  constructor(
    private context: ts.TransformationContext,
    private sourceNode: ts.SourceFile,
    private options: StarImportFileTransformOptions
  ) {}

  transform(): ts.SourceFile{
    const usageTransformer = new StarImportUsageTransformer(this.context, this.sourceNode, this.options);
    const sourceFile = usageTransformer.transform();

    return ts.visitNode(sourceFile, node => this.visitor(node, usageTransformer));
  }

  private visitor(node: ts.Node, usageTransformer: StarImportUsageTransformer): ts.VisitResult<ts.Node> {
    if (ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier)
      && usageTransformer.hasPackage(node.moduleSpecifier.text)
    ) {
      const packageName = node.moduleSpecifier.text;
      const pack = usageTransformer.getPackage(packageName);
      const { writePath, writeIdentifier } = this.options[packageName]!;

      return pack.usages.map(prop => {
        const pathDef = writePath!(prop);
        const importClause = pathDef.isNamed
          ? ts.createImportClause(undefined,
              ts.createNamedImports([
                ts.createImportSpecifier(
                  ts.createIdentifier(prop),
                  ts.createIdentifier(writeIdentifier!(prop)))
              ]))
          : ts.createImportClause(ts.createIdentifier(writeIdentifier!(prop)), undefined);

        return ts.createImportDeclaration(
          undefined,
          undefined,
          importClause,
          ts.createStringLiteral(pathDef.path));
      });
    }

    return ts.visitEachChild(node, n => this.visitor(n, usageTransformer), this.context);
  }
}

export class StarImportUsageTransformer {
  private packages: {
    [key: string]: {
      hasStarImport: boolean;
      starImportAs: string;
      usages: string[];
      identifier: (prop: string) => string;
    }
  } = {};

  private packageAliasToName: { [key: string]: string } = {};
  private packageNames: string[] = [];
  private importAs: string[] = [];

  constructor(
    private context: ts.TransformationContext,
    private sourceNode: ts.SourceFile,
    private options: StarImportFileTransformOptions
  ) {
    Object.keys(this.options).forEach(key => {
      this.packages[key] = {
        hasStarImport: false,
        starImportAs: '',
        usages: [],
        identifier: this.options[key].writeIdentifier!
      };
    });

    this.packageNames = Object.keys(this.packages);
  }

  transform(): ts.SourceFile {
    return ts.visitNode(this.sourceNode, node => this.visitor(node));
  }

  getPackage(name: string): StarImportUsageTransformer['packages'][''] {
    return this.packages[name];
  }

  getPackageByAlias(alias: string): StarImportUsageTransformer['packages'][''] {
    return this.packages[this.packageAliasToName[alias]];
  }

  hasPackage(name: string): boolean {
    return this.packageNames.indexOf(name) !== -1;
  }

  private setPackageImportAs(name: string, as: string): void {
    this.packages[name].starImportAs = as;
    this.packages[name].hasStarImport = true;
    this.importAs.push(as);
    this.packageAliasToName[as] = name;
  }

  private isImportAlias(name: string): boolean {
    return this.importAs.indexOf(name) !== -1;
  }

  private visitor(node: ts.Node): ts.VisitResult<ts.Node> {
    if (ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier)
      && this.hasPackage(node.moduleSpecifier.text)
      && node.importClause
      && node.importClause.namedBindings
      && ts.isNamespaceImport(node.importClause.namedBindings)
    ) {
      this.setPackageImportAs(node.moduleSpecifier.text, node.importClause.namedBindings.name.text);
    }

    if (ts.isPropertyAccessExpression(node)
      && ts.isIdentifier(node.expression)
      && this.isImportAlias(node.expression.text)
    ) {
      const pack = this.getPackageByAlias(node.expression.text);

      pack.usages.push(node.name.text);

      return ts.createIdentifier(pack.identifier(node.name.text));
    }

    return ts.visitEachChild(node, n => this.visitor(n), this.context);
  }
}