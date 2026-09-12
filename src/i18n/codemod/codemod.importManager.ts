/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine
 * Import Manager & React Hook Safety Analyzer
 */

import ts from 'typescript';
import path from 'path';
import { SourceFileType } from './codemod.types';

export interface HookSafetyAnalysis {
  canUseHook: boolean;
  componentName: string | null;
  componentNode: ts.Node | null;
  isInsideLoop: boolean;
  isInsideCondition: boolean;
  isInsideCallback: boolean;
  isInsideNestedFunction: boolean;
  alreadyHasTHook: boolean;
  needsImport: boolean;
  recommendedImportStatement: string;
  reason?: string;
}

export interface FileStructureAnalysis {
  fileType: SourceFileType;
  isReactFile: boolean;
  hasI18nImport: boolean;
  i18nImportNode: ts.ImportDeclaration | null;
  components: Array<{
    name: string;
    node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression;
    body: ts.Block;
    hasTHook: boolean;
  }>;
}

export class CodemodImportManager {
  /**
   * Analyzes an entire TypeScript source file structure.
   */
  public analyzeFile(sourceFile: ts.SourceFile, filePath: string): FileStructureAnalysis {
    let isReactFile = false;
    let hasI18nImport = false;
    let i18nImportNode: ts.ImportDeclaration | null = null;
    const components: FileStructureAnalysis['components'] = [];

    const isTsx = filePath.endsWith('.tsx');

    // 1. Scan top-level imports
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        const moduleSpecifier = statement.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          if (importPath === 'react' || importPath.startsWith('react/')) {
            isReactFile = true;
          }
          if (importPath.includes('i18n') || importPath.endsWith('/i18n')) {
            // Check if useI18n is named
            if (statement.importClause && statement.importClause.namedBindings) {
              if (ts.isNamedImports(statement.importClause.namedBindings)) {
                for (const element of statement.importClause.namedBindings.elements) {
                  if (element.name.text === 'useI18n') {
                    hasI18nImport = true;
                    i18nImportNode = statement;
                  }
                }
              }
            }
          }
        }
      }
    }

    // 2. Scan component declarations
    const checkNodeForComponent = (node: ts.Node) => {
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        this.isPascalCase(node.name.text) &&
        node.body
      ) {
        isReactFile = true;
        components.push({
          name: node.name.text,
          node,
          body: node.body,
          hasTHook: this.checkBlockForTHook(node.body),
        });
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (
            ts.isIdentifier(decl.name) &&
            this.isPascalCase(decl.name.text) &&
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
          ) {
            isReactFile = true;
            const body = decl.initializer.body;
            if (ts.isBlock(body)) {
              components.push({
                name: decl.name.text,
                node: decl.initializer,
                body,
                hasTHook: this.checkBlockForTHook(body),
              });
            }
          }
        }
      }
    };

    sourceFile.forEachChild(checkNodeForComponent);

    let fileType: SourceFileType = 'UNSUPPORTED';
    if (isTsx) {
      fileType = components.length > 0 ? 'COMPONENT_TSX' : 'NON_COMPONENT_TSX';
    } else if (filePath.endsWith('.ts')) {
      fileType = 'MODULE_TS';
    }

    return {
      fileType,
      isReactFile,
      hasI18nImport,
      i18nImportNode,
      components,
    };
  }

  /**
   * Verifies if a given AST node is in a location where `t()` can be safely called via `useI18n()`.
   */
  public analyzeHookSafety(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): HookSafetyAnalysis {
    const fileAnalysis = this.analyzeFile(sourceFile, filePath);

    // Non-React files cannot safely use React hooks!
    if (!fileAnalysis.isReactFile && !filePath.endsWith('.tsx')) {
      return {
        canUseHook: false,
        componentName: null,
        componentNode: null,
        isInsideLoop: false,
        isInsideCondition: false,
        isInsideCallback: false,
        isInsideNestedFunction: false,
        alreadyHasTHook: false,
        needsImport: false,
        recommendedImportStatement: '',
        reason: 'FILE_NOT_REACT_COMPONENT',
      };
    }

    // Traverse upwards from node to find enclosing constructs
    let current: ts.Node | undefined = node.parent;
    let isInsideLoop = false;
    let isInsideCondition = false;
    let isInsideCallback = false;
    let isInsideNestedFunction = false;
    let enclosingComponent: { name: string; node: ts.Node; body: ts.Block } | null = null;

    while (current && current !== sourceFile) {
      // Check loops
      if (
        ts.isForStatement(current) ||
        ts.isForInStatement(current) ||
        ts.isForOfStatement(current) ||
        ts.isWhileStatement(current) ||
        ts.isDoStatement(current)
      ) {
        isInsideLoop = true;
      }

      // Check conditions
      if (ts.isIfStatement(current) || ts.isConditionalExpression(current) || ts.isSwitchStatement(current)) {
        isInsideCondition = true;
      }

      // Check if inside callback / event handler
      if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
        // Is this the component itself or a nested callback?
        const comp = fileAnalysis.components.find((c) => c.node === current);
        if (comp) {
          enclosingComponent = comp;
          break;
        } else {
          // Inside a callback or nested function
          isInsideCallback = true;
          isInsideNestedFunction = true;
        }
      }

      // Check function declaration
      if (ts.isFunctionDeclaration(current)) {
        const comp = fileAnalysis.components.find((c) => c.node === current);
        if (comp) {
          enclosingComponent = comp;
          break;
        } else {
          isInsideNestedFunction = true;
        }
      }

      current = current.parent;
    }

    if (!enclosingComponent) {
      // Fall back to top-level single component in file if exists
      if (fileAnalysis.components.length === 1) {
        enclosingComponent = fileAnalysis.components[0];
      }
    }

    if (!enclosingComponent) {
      return {
        canUseHook: false,
        componentName: null,
        componentNode: null,
        isInsideLoop,
        isInsideCondition,
        isInsideCallback,
        isInsideNestedFunction,
        alreadyHasTHook: false,
        needsImport: false,
        recommendedImportStatement: '',
        reason: 'NO_ENCLOSING_COMPONENT_FOUND',
      };
    }

    const alreadyHasTHook = this.checkBlockForTHook(enclosingComponent.body);
    const relImport = this.calculateRelativeI18nPath(filePath);
    const recommendedImport = `import { useI18n } from '${relImport}';`;

    return {
      canUseHook: true,
      componentName: enclosingComponent.name,
      componentNode: enclosingComponent.node,
      isInsideLoop,
      isInsideCondition,
      isInsideCallback,
      isInsideNestedFunction,
      alreadyHasTHook,
      needsImport: !fileAnalysis.hasI18nImport,
      recommendedImportStatement: recommendedImport,
    };
  }

  /**
   * Checks whether a component body block already declares `const { t } = useI18n()`
   */
  public checkBlockForTHook(block: ts.Block): boolean {
    for (const statement of block.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (decl.initializer && ts.isCallExpression(decl.initializer)) {
            const expr = decl.initializer.expression;
            if (ts.isIdentifier(expr) && expr.text === 'useI18n') {
              if (ts.isObjectBindingPattern(decl.name)) {
                for (const elem of decl.name.elements) {
                  if (ts.isIdentifier(elem.name) && elem.name.text === 't') {
                    return true;
                  }
                }
              }
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Calculates the relative import path from a file to `src/i18n`.
   */
  public calculateRelativeI18nPath(fromFilePath: string): string {
    const normFrom = fromFilePath.replace(/\\/g, '/');
    const dir = path.dirname(normFrom);
    let rel = path.relative(dir, 'src/i18n').replace(/\\/g, '/');
    if (!rel.startsWith('.')) {
      rel = './' + rel;
    }
    return rel;
  }

  private isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }
}
