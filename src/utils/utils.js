function getImportSpecifierName (specifier) {
  return specifier.imported.name;
}

function isFunction (node) {
  switch (node.type) {
    case "FunctionExpression":
    case "FunctionDeclaration":
    case "ArrowFunctionExpression":
      return true;
    default:
      return false;
  }
}

function isPathNodeValid (path, validator) {
  return validator(path.node);
}

function unwrapPath (path, type) {
  if (isPathNodeValid(path, type)) {
    return path;
  }

  return null;
}

module.exports = {getImportSpecifierName, isFunction, isPathNodeValid, unwrapPath};