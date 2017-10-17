/*
 * SonarTS
 * Copyright (C) 2017-2017 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as tslint from "tslint";
import * as ts from "typescript";
import { SonarRuleMetaData } from "../sonarRule";
import { firstAncestor, is, COMPOUND_ASSIGNMENTS } from "../utils/navigation"
import { SymbolTableBuilder } from "../symbols/builder";
import { Usage, SymbolTable, UsageFlag } from "../symbols/table";

export class Rule extends tslint.Rules.TypedRule {
  public static metadata: SonarRuleMetaData = {
    ruleName: "no-unused-array",
    description: "Collection and array contents should be used",
    optionsDescription: "",
    options: null,
    rspecKey: "RSPEC-4030",
    type: "functionality",
    typescriptOnly: false,
  };

  private static writePatterns: ((statement: ts.ExpressionStatement, usage: Usage) => boolean)[] = [
    Rule.writeElement,
    Rule.writeValue,
    Rule.writingMethodCall,
  ];

  public static MESSAGE = "Either use this array's contents or remove the array.";

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): tslint.RuleFailure[] {
    const symbols = SymbolTableBuilder.build(sourceFile, program);
    const walker = new tslint.RuleWalker(sourceFile, this.getOptions());
    
    symbols
      .getSymbols()
      .filter(symbol => Rule.isArray(symbol, program.getTypeChecker(), symbols))
      .filter(symbol => {
        const declaration = Rule.getDeclaration(symbol, symbols);
        return declaration && !firstAncestor(declaration, [ts.SyntaxKind.Parameter, ts.SyntaxKind.ImportDeclaration]) && !Rule.isExported(declaration);
      })
      .filter(symbol => {
        const declaration = Rule.getDeclaration(symbol, symbols);
        if (declaration && declaration.parent && is(declaration.parent, ts.SyntaxKind.VariableDeclaration)) {
          const varDeclaration = declaration.parent as ts.VariableDeclaration;
          return !varDeclaration.initializer || is(varDeclaration.initializer, ts.SyntaxKind.ArrayLiteralExpression);
        }

        return true;
       })
      .filter(symbol => !symbols.allUsages(symbol).some(usage => Rule.isReadUsage(usage)))
      .filter(symbol => symbols.allUsages(symbol).length > 1)

      .forEach(symbol => walker.addFailureAtNode(Rule.getDeclaration(symbol, symbols)!, Rule.MESSAGE));

    return walker.getFailures();
  }

  private static isExported(declaration: ts.Node): boolean {
    const varStatement = firstAncestor(declaration, [ts.SyntaxKind.VariableStatement]);
    return !!varStatement && is(varStatement.getFirstToken(), ts.SyntaxKind.ExportKeyword);
  }

  private static isReadUsage(usage: Usage): boolean {
    if (usage.is(UsageFlag.DECLARATION)) {
      return false;
    }

    const expressionStatement = firstAncestor(usage.node, [ts.SyntaxKind.ExpressionStatement]) as ts.ExpressionStatement;
    if (expressionStatement) {
      return !Rule.writePatterns.some(pattern => pattern(expressionStatement, usage));
    }
    return true;
  }

  // myArray = [1, 2];
  private static writeValue(statement: ts.ExpressionStatement, usage: Usage): boolean {
    if (is(statement.expression, ts.SyntaxKind.BinaryExpression)) {
      const binaryExpression = statement.expression as ts.BinaryExpression;
      return is(binaryExpression.operatorToken,  ts.SyntaxKind.EqualsToken) && binaryExpression.left === usage.node && is(binaryExpression.right, ts.SyntaxKind.ArrayLiteralExpression);
    }

    return false;
  }

  // myArray[1] = 42;
  // myArray[1] += 42;
  private static writeElement(statement: ts.ExpressionStatement, usage: Usage): boolean {
    if (is(statement.expression, ts.SyntaxKind.BinaryExpression)) {
      const binaryExpression = statement.expression as ts.BinaryExpression;
      if (is(binaryExpression.operatorToken,  ts.SyntaxKind.EqualsToken, ...COMPOUND_ASSIGNMENTS) && is(binaryExpression.left,  ts.SyntaxKind.ElementAccessExpression)) {
        return (binaryExpression.left as ts.ElementAccessExpression).expression === usage.node;
      }
    }

    return false;
  }

  // myArray.push(1);
  private static writingMethodCall(statement: ts.ExpressionStatement, usage: Usage): boolean {
    const writingMethods = new Set([
      "copyWithin",
      "fill",
      "pop",
      "push",
      "reverse",
      "shift",
      "sort",
      "splice",
      "unshift",
    ]);

    if (is(statement.expression, ts.SyntaxKind.CallExpression)) {
      const callExpression = statement.expression as ts.CallExpression;
      if (is(callExpression.expression, ts.SyntaxKind.PropertyAccessExpression)) {
        const propertyAccess = callExpression.expression as ts.PropertyAccessExpression;
        return propertyAccess.expression === usage.node && writingMethods.has(propertyAccess.name.text);
      }
    }

    return false;
  }

  private static getDeclaration(symbol: ts.Symbol, symbols: SymbolTable): ts.Node | null {
    const declarationUsage = symbols.allUsages(symbol).find(usage => usage.is(UsageFlag.DECLARATION)); 
    if (!declarationUsage) {
      return null;
    }

    return declarationUsage.node;
  }

  private static isArray(symbol: ts.Symbol, typeChecker: ts.TypeChecker, symbols: SymbolTable): boolean {
    const usage = symbols.allUsages(symbol)[0];
    const type = typeChecker.getTypeAtLocation(usage.node);
    return !!type.symbol && type.symbol.name === "Array";
  }
}
