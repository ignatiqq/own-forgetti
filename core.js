import * as t from '@babel/types';

// traverse helpers

function getImportSpecifierName(specifier) {
  return specifier.imported.name;
}

function isFunction(node) {
  switch (node.type) {
    case "FunctionExpression":
    case "FunctionDeclaration":
    case "ArrowFunctionExpression":
      return true;
    default:
      return false;
  }
}

function isPathNodeValid(path, validator) {
  return validator(path.node);
}

function unwrapPath(path, type) {
  if (isPathNodeValid(path, type)) {
    return path;
  }

  return null;
}

// traverse helpers end

// forgetti utils

function isHookOrComponent(ctx, name) {
  return ctx.filters.component.source.test(name) || ctx.filters.hook.source.test(name);
}

function registerHookSpecifiers(ctx, path, hook) {
  if (path.node.specifiers.length === 0) return;
  for (let i = 0; i < path.node.specifiers.length; i++) {
    const specifier = path.node.specifiers[i];

    // add import hooks to "imports" context
    switch (specifier.type) {
      case "ImportSpecifier": {
        if (hook.kind === "named" && getImportSpecifierName(specifier) === hook.name) {
          ctx.registrations.hooks.identifiers.set(specifier.local, hook);
        }
        break;
      }
    }
  }
}

function extractImportIdentifiers(ctx, path): void {
  // name of default specifier path name
  const importPath = path.node.source.value;

  // Identify hooks
  const { imports } = ctx.preset;
  // search for any hook in config
  for (let i = 0, len = imports.hooks.length; i < len; i++) {
    const hook = imports.hooks[i];
    // check for ('react') import path from preset
    if (importPath === hook.source) {
      // check for compatability within name and current hook name
      registerHookSpecifiers(ctx, path, hook);
    }
  }
}

function inlineExpression(parentPath, path) {
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
          isPathNodeValid(binding.path.id, t.isIdentifier) &&
          // in single scope
          binding.path.scope.getBlockParent() === ref.scope.getBlockParent()
        ) {
          // replace on inline
          ref.replaceWith(binding.path.node.init);
          binding.path.remove();
        }
      }
    }
  }
}

function transformFunction(ctx, path) {
  const unwrappedPath = unwrapPath(path, isFunction);

  if (unwrappedPath === null || !isHookOrComponent(ctx, unwrappedPath.node.id.name)) return;

  // optimize steps:
  // 1. inline expressions
  path.traverse({
    // check for callExpressions (hooks and functions)
    Expression(exprPath) {
      inlineExpression(path, exprPath);
    }
  });
}

// for const Component = () => {} notation
function transformVariableDeclarator(ctx, path) {
  if (path.node.init && isHookOrComponent(ctx, path.node.id.name)) {
    transformFunction(ctx, path.get("init"));
  }
}

export default function (babel) {
  const { types: t } = babel;

  const res = {
    name: "modify-dynamicLoad-arguments", // not required
    visitor: {
      Program(path, { opts }) {
        const preset = presets["react"];

        const ctx = {
          imports: new Map(),
          preset: presets["react"],
          registrations: {
            hooks: {
              identifiers: new Map()
            }
          },
          filters: presets["react"].filters
        };

        path.traverse({
          ImportDeclaration(path: any) {
            extractImportIdentifiers(ctx, path);
            console.log(ctx);
          }
        });

        // Check all hooks and functions
        path.traverse({
          FunctionExpression(path) {
            transformFunction(ctx, path, true);
          },
          FunctionDeclaration(path) {
            transformFunction(ctx, path, true);
          },
          VariableDeclarator(path) {
            transformVariableDeclarator(ctx, path);
          }
        });
      }
    }
  };
  return res;
}

const presets = {
  react: {
    filters: {
      component: {
        source: new RegExp("^[A-Z]")
      },
      hook: {
        source: new RegExp("^use[A-Z]")
      }
    },
    runtime: {
      useRef: {
        name: "useRef",
        source: "react",
        kind: "named"
      },
      useMemo: {
        name: "useMemo",
        source: "react",
        kind: "named"
      },
      memo: {
        name: "memo",
        source: "react",
        kind: "named"
      }
    },
    imports: {
      hooks: [
        {
          type: "ref",
          name: "useRef",
          source: "react",
          kind: "named"
        },
        {
          type: "memo",
          name: "useMemo",
          source: "react",
          kind: "named"
        },
        {
          type: "callback",
          name: "useCallback",
          source: "react",
          kind: "named"
        },
        {
          type: "effect",
          name: "useEffect",
          source: "react",
          kind: "named"
        },
        {
          type: "effect",
          name: "useLayoutEffect",
          source: "react",
          kind: "named"
        }
      ]
    }
  }
};
