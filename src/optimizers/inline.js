const t = require("@babel/types");
const {isPathNodeValid} = require("../utils/utils");

module.exports = module.export = function inlineExpressions(path) {
    path.traverse({
    // check for callExpressions (hooks and functions)
    Expression (exprPath) {
      inlineExpression(path, exprPath);
    }
  });
};

function inlineExpression (parentPath, path) {
    // don't want to check nested expressions
    if (path.getFunctionParent() !== parentPath) return;
  
    const binding = path.scope.getBinding(path.node.name);
  
    // allow only: [Identifier]
    if (!binding) return;
  
    const totalRefs = binding.references;
  
    // we should move to place where it used only if it ref to one place of code
    // to not duplicate get operation
    if (totalRefs === 1) {
      switch (binding.kind) {
        case "const":
        case "let":
        case "var": {
          // move the node to the reference
          const ref = binding.referencePaths[0];
  
          if (
            // is var declaration
            isPathNodeValid(binding.path, t.isVariableDeclarator) &&
            // has initializator
            binding.path.node.init &&
            // hase declarator var
            isPathNodeValid(binding.path.get("id"), t.isIdentifier) &&
            // in single scope
            binding.path.scope.getBlockParent() === ref.scope.getBlockParent()
          ) {
            // replace reference to value
            ref.replaceWith(binding.path.node.init);
            binding.path.remove();
          }
        }
      }
    }
  }
  