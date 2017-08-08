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
import * as ts from "typescript";
import { CfgBlock, CfgBlockWithPredecessors, ControlFlowGraph } from "../cfg/cfg";
import { isAssignment, retrievePureIdentifier } from "../utils/navigation";
import { SymbolTable, Usage, UsageFlag } from "./table";

export class LiveVariableAnalyzer {
  private blocksReads: Map<CfgBlock, Map<ts.Symbol, Usage>>;

  constructor(private readonly symbols: SymbolTable) {}

  public analyze(cfg: ControlFlowGraph) {
    this.blocksReads = new Map<CfgBlock, Map<ts.Symbol, Usage>>();
    const blocks = cfg.getBlocks().concat(cfg.end);
    while (blocks.length > 0) {
      const block = blocks.pop()!;
      const newLive = this.analyzeBlock(block);
      const oldLive = this.blocksReads.get(block);
      if (!this.sameSymbols(newLive, oldLive)) {
        if (block instanceof CfgBlockWithPredecessors) {
          blocks.unshift(...block.predecessors);
        }
      }
      const mergedLive = this.merge(newLive, oldLive);
      this.blocksReads.set(block, mergedLive);
    }
  }

  private analyzeBlock(block: CfgBlock) {
    const availableReads = this.collectAvailableReads(block);
    console.log(block.getLabel() + " received : " + report(availableReads));
    [...block.getElements()].reverse().forEach(node => {
      const usage = this.symbols.getUsage(nodeOrAssignmentIdentifier(node));
      if (usage) {
        const position = node.getSourceFile().getLineAndCharacterOfPosition(node.getEnd());
        if (usage.is(UsageFlag.WRITE)) {
          if (availableReads.has(usage.symbol)) {
            usage.dead = false;
            availableReads.delete(usage.symbol);
          } else {
            usage.dead = true;
          }
        }
        if (usage.is(UsageFlag.READ)) {
          availableReads.set(usage.symbol, usage);
        }
        console.log((position.line + 1) + "," + position.character + " " + node.getText() + " : " + usage.flagsAsString() + " dead:" + usage.dead);
      }
    });
    console.log(block.getLabel() + " resulted : " + report(availableReads));
    return availableReads;

    function nodeOrAssignmentIdentifier(node: ts.Node): ts.Node | ts.Identifier {
      if (isAssignment(node)) {
        const identifier = retrievePureIdentifier(node.left);
        if (identifier) return identifier;
      }
      return node;
    }
  }

  private collectAvailableReads(block: CfgBlock) {
    const availableReads = new Map<ts.Symbol, Usage>();
    block.getSuccessors().forEach(successor => {
      const availableReadsInSuccessor = this.blocksReads.get(successor);
      if (availableReadsInSuccessor) {
        availableReadsInSuccessor.forEach((usage, symbol) => availableReads.set(symbol, usage));
      }
    });
    return availableReads;
  }

  private sameSymbols(newLive: Map<ts.Symbol, Usage>, oldLive: Map<ts.Symbol, Usage> | undefined) {
    if (oldLive === undefined) return false;
    if (oldLive.size !== newLive.size) return false;
    for (const symbol of newLive.keys()) {
      if (!oldLive.has(symbol)) {
        return false;
      }
    }
    return true;
  }

  private merge(newLive: Map<ts.Symbol, Usage>, oldLive: Map<ts.Symbol, Usage> | undefined) {
    if (oldLive === undefined) return newLive;
    oldLive.forEach((usage, symbol) => {
      newLive.set(symbol, usage);
    });
    return newLive;
  }
}

function report(availableReads: Map<ts.Symbol, Usage>) {
  let result = "";
  availableReads.forEach((_, symbol) => {
    result += symbol.name + " ";
  });
  return "[" + result + "]";
}
