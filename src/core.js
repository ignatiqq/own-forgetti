const t = require("@babel/types");
const { getImportSpecifierName, isFunction, unwrapPath } = require("./utils/utils");
const inlineExpressions = require("./optimizers/inline");
const simplifyExpressions = require("./optimizers/simplify");
const expandExpressions = require("./optimizers/expand");
const {isHook, isHookOrComponent} = require("./utils/isHook");

function registerHookSpecifiers (ctx, path, hook) {
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

      case "ImportNamespaceSpecifier":
      case "ImportDefaultSpecifier": {
        if(specifier.local.name) {
          // Track list of hooks which can be used from specifier
          let key = ctx.registrations.hooks.namespaces.get(specifier.local);

          if(!key) key = [];
          key.push(hook);
          ctx.registrations.hooks.namespaces.set(specifier.local, key);
          break;
        }
      }
    }
  }
}

function extractImportIdentifiers (ctx, path) {
  // name of default specifier path name import React from ("react") <- source
  const importPath = path.node.source.value;

  // Identify hooks
  const { imports } = ctx.preset;
  // search for any hook in config
  for (let i = 0; i < imports.hooks.length; i++) {
    const hook = imports.hooks[i];
    // check for ('react') import path from preset
    if (importPath === hook.source) {
      // check for compatability within name and current hook name
      registerHookSpecifiers(ctx, path, hook);
    }
  }
}

function transformFunction (ctx, path) {
  const unwrappedPath = unwrapPath(path, isFunction);

  if (unwrappedPath === null || !isHookOrComponent(ctx, unwrappedPath.node.id.name)) return;

  // optimize steps:
  // 1. inline expressions
  inlineExpressions(path);
  simplifyExpressions(path);
  expandExpressions(ctx, path);
}

// for const Component = () => {} notation
function transformVariableDeclarator (ctx, path) {
  if (path.node.init && isHookOrComponent(ctx, path.node.id.name)) {
    transformFunction(ctx, path.get("init"));
  }
}

module.exports = function () {
  const res = {
    name: "simple-forgetti", // not required
    visitor: {
      Program (path, { opts }) {
        const preset = opts.preset;

        const ctx = {
          imports: new Map(),
          preset,
          registrations: {
            hooks: {
              // import {useMemo} from 'react';
              identifiers: new Map(),
              // import React from 'react'; || import * as React from 'react;
              namespaces: new Map()
            }
          },
          filters: preset.filters
        };

        path.traverse({
          ImportDeclaration (path) {
            extractImportIdentifiers(ctx, path);
          }
        });

        // Check all hooks and functions
        path.traverse({
          FunctionExpression (path) {
            transformFunction(ctx, path, true);
          },
          FunctionDeclaration (path) {
            transformFunction(ctx, path, true);
          },
          VariableDeclarator (path) {
            transformVariableDeclarator(ctx, path);
          }
        });
      }
    }
  };
  return res;
}, {isHook};
