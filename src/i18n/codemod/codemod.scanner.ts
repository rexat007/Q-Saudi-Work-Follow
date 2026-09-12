/**
 * BLOCK 44 — Safe Automated i18n Codemod Engine
 * AST Scanner & Candidate Extractor
 */

import ts from 'typescript';
import {
  CandidateNodeKind,
  SourceLocation,
} from './codemod.types';
import {
  SAFE_JSX_ATTRIBUTES,
  EXCLUDED_TECHNICAL_ATTRIBUTES,
  USER_FACING_CALL_PATTERNS,
  TECHNICAL_LOGGING_CALLS,
  PROTECTED_BUSINESS_TOKENS,
} from './codemod.constants';

export interface RawCandidate {
  node: ts.Node;
  nodeKind: CandidateNodeKind;
  originalText: string;
  sourceLocation: SourceLocation;
  attributeName?: string;
  callPattern?: string;
  isAlreadyTranslated: boolean;
  hasEmbeddedSiblings: boolean;
  interpolationParams: string[];
  isStringConcatenation: boolean;
  internalDataKey?: string;
  semanticContext: string;
}

export class CodemodScanner {
  /**
   * Scans a file's AST and extracts all string / expression candidates.
   */
  public scanSourceFile(sourceFile: ts.SourceFile, filePath: string): RawCandidate[] {
    const candidates: RawCandidate[] = [];

    // Helper to get line & column
    const getLocation = (node: ts.Node): SourceLocation => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      return {
        line: line + 1,
        column: character + 1,
        startPos: node.getStart(),
        endPos: node.getEnd(),
      };
    };

    // Helper to detect if node is inside or is a t() call
    const isInsideTCall = (node: ts.Node): boolean => {
      let curr: ts.Node | undefined = node;
      while (curr && curr !== sourceFile) {
        if (ts.isCallExpression(curr)) {
          const expr = curr.expression;
          if (ts.isIdentifier(expr) && expr.text === 't') {
            return true;
          }
        }
        curr = curr.parent;
      }
      return false;
    };

    const visit = (node: ts.Node) => {
      // 1. Detect already-translated t(...) calls
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isIdentifier(expr) && expr.text === 't') {
          const arg0 = node.arguments[0];
          if (arg0 && ts.isStringLiteral(arg0)) {
            candidates.push({
              node,
              nodeKind: 'CallExpression',
              originalText: arg0.text,
              sourceLocation: getLocation(node),
              callPattern: 't',
              isAlreadyTranslated: true,
              hasEmbeddedSiblings: false,
              interpolationParams: [],
              isStringConcatenation: false,
              semanticContext: 'already_translated_t_call',
            });
          }
          return; // Do not inspect inside t()
        }

        // 2. Detect user-facing or technical calls (e.g. toast.success("..."), console.log("..."))
        const callName = this.getCallExpressionName(node);
        if (callName) {
          if (TECHNICAL_LOGGING_CALLS.has(callName)) {
            const arg0 = node.arguments[0];
            if (arg0 && (ts.isStringLiteral(arg0) || ts.isNoSubstitutionTemplateLiteral(arg0))) {
              candidates.push({
                node: arg0,
                nodeKind: 'CallExpression',
                originalText: arg0.text,
                sourceLocation: getLocation(arg0),
                callPattern: callName,
                isAlreadyTranslated: false,
                hasEmbeddedSiblings: false,
                interpolationParams: [],
                isStringConcatenation: false,
                semanticContext: `technical_call_${callName}`,
              });
            }
          } else if (USER_FACING_CALL_PATTERNS.has(callName)) {
            const arg0 = node.arguments[0];
            if (arg0) {
              if (ts.isStringLiteral(arg0) || ts.isNoSubstitutionTemplateLiteral(arg0)) {
                candidates.push({
                  node: arg0,
                  nodeKind: 'CallExpression',
                  originalText: arg0.text,
                  sourceLocation: getLocation(arg0),
                  callPattern: callName,
                  isAlreadyTranslated: isInsideTCall(arg0),
                  hasEmbeddedSiblings: false,
                  interpolationParams: [],
                  isStringConcatenation: false,
                  semanticContext: `call_${callName.replace('.', '_')}`,
                });
              } else if (ts.isTemplateExpression(arg0)) {
                // Template literal inside toast: e.g. `تم تسجيل ${count} رحلة`
                const params = this.extractTemplateParams(arg0);
                const rawTemplateText = this.getTemplateExpressionRaw(arg0);
                candidates.push({
                  node: arg0,
                  nodeKind: 'TemplateExpression',
                  originalText: rawTemplateText,
                  sourceLocation: getLocation(arg0),
                  callPattern: callName,
                  isAlreadyTranslated: isInsideTCall(arg0),
                  hasEmbeddedSiblings: false,
                  interpolationParams: params,
                  isStringConcatenation: false,
                  semanticContext: `call_template_${callName.replace('.', '_')}`,
                });
              } else if (ts.isBinaryExpression(arg0) && arg0.operatorToken.kind === ts.SyntaxKind.PlusToken) {
                // Concatenation inside toast
                candidates.push({
                  node: arg0,
                  nodeKind: 'BinaryExpression',
                  originalText: arg0.getText(sourceFile),
                  sourceLocation: getLocation(arg0),
                  callPattern: callName,
                  isAlreadyTranslated: false,
                  hasEmbeddedSiblings: false,
                  interpolationParams: [],
                  isStringConcatenation: true,
                  semanticContext: `call_concat_${callName.replace('.', '_')}`,
                });
              }
            }
          }
        }
      }

      // 3. Detect JSXText
      if (ts.isJsxText(node)) {
        const rawText = node.getText(sourceFile);
        const trimmed = rawText.trim();
        if (trimmed.length > 0 && this.hasArabicOrText(trimmed)) {
          // Check sibling nodes in parent JsxElement
          const parent = node.parent;
          let hasEmbeddedSiblings = false;
          if (ts.isJsxElement(parent)) {
            for (const child of parent.children) {
              if (ts.isJsxExpression(child) && child.expression) {
                hasEmbeddedSiblings = true;
                break;
              }
            }
          }

          candidates.push({
            node,
            nodeKind: 'JsxText',
            originalText: trimmed,
            sourceLocation: getLocation(node),
            isAlreadyTranslated: isInsideTCall(node),
            hasEmbeddedSiblings,
            interpolationParams: [],
            isStringConcatenation: false,
            semanticContext: 'jsx_text',
          });
        }
      }

      // 4. Detect JSXAttribute
      if (ts.isJsxAttribute(node)) {
        const attrName = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sourceFile);
        const initializer = node.initializer;

        if (initializer) {
          if (ts.isStringLiteral(initializer)) {
            const val = initializer.text.trim();
            if (val.length > 0) {
              candidates.push({
                node: initializer,
                nodeKind: 'JsxAttribute',
                originalText: val,
                sourceLocation: getLocation(initializer),
                attributeName: attrName,
                isAlreadyTranslated: isInsideTCall(initializer),
                hasEmbeddedSiblings: false,
                interpolationParams: [],
                isStringConcatenation: false,
                semanticContext: `jsx_attribute_${attrName}`,
              });
            }
          } else if (ts.isJsxExpression(initializer) && initializer.expression) {
            const expr = initializer.expression;
            if (ts.isStringLiteral(expr)) {
              const val = expr.text.trim();
              if (val.length > 0) {
                candidates.push({
                  node: expr,
                  nodeKind: 'JsxAttribute',
                  originalText: val,
                  sourceLocation: getLocation(expr),
                  attributeName: attrName,
                  isAlreadyTranslated: isInsideTCall(expr),
                  hasEmbeddedSiblings: false,
                  interpolationParams: [],
                  isStringConcatenation: false,
                  semanticContext: `jsx_attribute_${attrName}`,
                });
              }
            }
          }
        }
      }

      // 5. Detect BinaryExpression (+ concatenation)
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
        !ts.isBinaryExpression(node.parent) // Top-level concatenation chain
      ) {
        const textContent = node.getText(sourceFile);
        if (this.hasArabic(textContent)) {
          candidates.push({
            node,
            nodeKind: 'BinaryExpression',
            originalText: textContent,
            sourceLocation: getLocation(node),
            isAlreadyTranslated: isInsideTCall(node),
            hasEmbeddedSiblings: false,
            interpolationParams: [],
            isStringConcatenation: true,
            semanticContext: 'binary_expression_concatenation',
          });
        }
      }

      // 6. Detect TemplateExpression (outside call expression)
      if (ts.isTemplateExpression(node) && !ts.isCallExpression(node.parent)) {
        const rawTemplateText = this.getTemplateExpressionRaw(node);
        if (this.hasArabic(rawTemplateText)) {
          const params = this.extractTemplateParams(node);
          candidates.push({
            node,
            nodeKind: 'TemplateExpression',
            originalText: rawTemplateText,
            sourceLocation: getLocation(node),
            isAlreadyTranslated: isInsideTCall(node),
            hasEmbeddedSiblings: false,
            interpolationParams: params,
            isStringConcatenation: false,
            semanticContext: 'standalone_template_expression',
          });
        }
      }

      // 7. Detect ObjectLiteralExpression properties (e.g. columns, reports definitions)
      if (ts.isPropertyAssignment(node)) {
        const nameNode = node.name;
        const init = node.initializer;
        let propName: string | undefined;

        if (ts.isIdentifier(nameNode)) {
          propName = nameNode.text;
        } else if (ts.isStringLiteral(nameNode)) {
          propName = nameNode.text;
        }

        if (propName && (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init))) {
          const val = init.text.trim();
          if (this.hasArabic(val)) {
            candidates.push({
              node: init,
              nodeKind: 'ObjectLiteralExpression',
              originalText: val,
              sourceLocation: getLocation(init),
              isAlreadyTranslated: isInsideTCall(init),
              hasEmbeddedSiblings: false,
              interpolationParams: [],
              isStringConcatenation: false,
              internalDataKey: propName,
              semanticContext: `object_property_${propName}`,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return candidates;
  }

  private getCallExpressionName(call: ts.CallExpression): string | null {
    const expr = call.expression;
    if (ts.isIdentifier(expr)) {
      return expr.text;
    }
    if (ts.isPropertyAccessExpression(expr)) {
      const objName = expr.expression.getText();
      const propName = expr.name.text;
      return `${objName}.${propName}`;
    }
    return null;
  }

  private extractTemplateParams(template: ts.TemplateExpression): string[] {
    const params: string[] = [];
    for (const span of template.templateSpans) {
      const expr = span.expression;
      if (ts.isIdentifier(expr)) {
        params.push(expr.text);
      } else if (ts.isPropertyAccessExpression(expr)) {
        params.push(expr.name.text);
      } else {
        // Complex expression in template literal
        params.push(expr.getText());
      }
    }
    return params;
  }

  private getTemplateExpressionRaw(template: ts.TemplateExpression): string {
    let result = template.head.text;
    for (const span of template.templateSpans) {
      result += `\${${span.expression.getText()}}` + span.literal.text;
    }
    return result;
  }

  private hasArabic(text: string): boolean {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
  }

  private hasArabicOrText(text: string): boolean {
    if (this.hasArabic(text)) return true;
    return /^[A-Z][a-z0-9\s.,!?-]{2,}$/.test(text.trim());
  }
}
