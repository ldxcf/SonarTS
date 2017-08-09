import { Rule as noAllDuplicatedBranchesRule } from "./rules/noAllDuplicatedBranchesRule";
import { Rule as noArrayDeleteRule } from "./rules/noArrayDeleteRule";
import { Rule as noCollectionSizeMischeckRule } from "./rules/noCollectionSizeMischeckRule";
import { Rule as noDuplicatedBranchesRule } from "./rules/noDuplicatedBranchesRule";
import { Rule as noEmptyDestructuringRule } from "./rules/noEmptyDestructuringRule";
import { Rule as noIdenticalConditionsRule } from "./rules/noIdenticalConditionsRule";
import { Rule as noIdenticalExpressionsRule } from "./rules/noIdenticalExpressionsRule";
import { Rule as noIgnoredReturnRule } from "./rules/noIgnoredReturnRule";
import { Rule as noInconsistentReturnRule } from "./rules/noInconsistentReturnRule";
import { Rule as noMisleadingArrayReverseRule } from "./rules/noMisleadingArrayReverseRule";
import { Rule as noMisspelledOperatorRule } from "./rules/noMisspelledOperatorRule";
import { Rule as noMultilineStringLiteralsRule } from "./rules/noMultilineStringLiteralsRule";
import { Rule as noSelfAssignmentRule } from "./rules/noSelfAssignmentRule";
import { Rule as noUnconditionalJumpRule } from "./rules/noUnconditionalJumpRule";
import { Rule as noUselessIncrementRule } from "./rules/noUselessIncrementRule";
import { Rule as noUseOfEmptyReturnValueRule } from "./rules/noUseOfEmptyReturnValueRule";
import { Rule as noVariableUsageBeforeDeclarationRule } from "./rules/noVariableUsageBeforeDeclarationRule";

export default [
  noAllDuplicatedBranchesRule,
  noArrayDeleteRule,
  noCollectionSizeMischeckRule,
  noDuplicatedBranchesRule,
  noEmptyDestructuringRule,
  noIdenticalConditionsRule,
  noIdenticalExpressionsRule,
  noIgnoredReturnRule,
  noInconsistentReturnRule,
  noMisleadingArrayReverseRule,
  noMultilineStringLiteralsRule,
  noSelfAssignmentRule,
  noUnconditionalJumpRule,
  noUselessIncrementRule,
  noUseOfEmptyReturnValueRule,
  noVariableUsageBeforeDeclarationRule,
];
