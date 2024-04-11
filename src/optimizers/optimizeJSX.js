const t = require("@babel/types");

function extractJSXExpressionsFromJSXExpressionContainer(
    child,
    state,
  ) {
    const expr = child.get("expression");
    // collect all expressions <div val={fn()}> from JSX
    if (t.isExpression(expr)) {
      const id = state.expressions.length;
      state.expressions.push(expr.node);
      expr.replaceWith(
        t.memberExpression(state.source, t.numericLiteral(id), true),
      );
    }
  }

function extractJSXExpressionFromAttribute(node, state) {
    const value = node.get("value");

    // if component and prop is jsx <Component val={<div></div>}
    if(t.isJSXElement(value) || t.isJSXFragment(value)) { 
        // recursive call
        extractJSXExpressions(value, state);
    } else
    // <div value={anything} />
    if(t.isJSXExpressionContainer(value)) {
        extractJSXExpressionsFromJSXExpressionContainer(value, state);
    }
}

function extractJSXExpressionsFromAttributes(path, state) {
    // can be improved to check components or member expression components like <Styled.* />
    const openingEl = path.get("openingElement");
    const attrsFromTag = openingEl.get("attributes");

    for(let attr of attrsFromTag) {
        if(!t.isJSXAttribute(attr)) continue;

        extractJSXExpressionFromAttribute(attr, state);
        // can be improved by adding spread check
    }
}

function extractJSXExpressionsFromJSXElement(path, state) {
    const openingElement = path.get("openingElement");
    const openingName = openingElement.get("name");

    // Extract Components
    if(t.isJSXIdentifier(openingName)) {
        // 1.       dot notation                or        just component
        if(t.isJSXMemberExpression(openingName) || /^[A-Z_]/.test(openingName)) {
            const name = getParentFunctionName(path) ||  "Component";
            const id = path.scope.generateUidIdentifier(name);
            const index = state.expressions.length;
            // another expression (component) found
            state.expressions.push(t.identifier(name));
            // push extracted jsx to optimize to state
            state.jsx.push({
                id,
                // source стейта это переменная где хранятся все значение вычленненные из нее (для оптимизации)
                value: t.memberExpression(state.source, t.numericLiteral(index), true)
            });
            const newIdentifierNode = t.jsxIdentifier(id.name);
            // replace original Component name for generated one
            openingName.replaceWith(newIdentifierNode);
            
            // if not self closing element
            if(!openingElement.selfClosing) {
                path.get("closingElement").get("name").replaceWith(newIdentifierNode);
            }
        }
    }

   extractJSXExpressionsFromAttributes(path, state);
}

// recursive search and collect for jsx elements
function extractJSXExpressions(path, state) {

    // collect element
    if(t.isJSXElement(path)) {
        extractJSXExpressionsFromJSXElement(path, state);
    }
}

function transformJSX(ctx, path, memoDefinition) {
    // runs on every jsx element to extract Component to var (if Component) and attributes of jsx
    const state = {
        source: path.scope.generateUidIdentifier("values"),
        // </div>
        jsx: [],
        // {str}
        expressions: []
    };

    /**
    * Basically we just put all expression in Components / JSX 
    * to variables to memoize it like
    * <Component val={fn()} /> will be transform to <Component val={_values[0]} />
    * or
    * <div val={fn()} /> will be transform to <div val={_values[0]} />
    */
    extractJSXExpressions(path, state);

    // Create blocks with declarations of Components
    // let body;
    if(state.jsx.length > 0) {
        const declarations = [];
        // create component variables
        for(let component of state.jsx) {
            declarations.push(t.variableDeclarator(component.id, component.value));
        }
        body = t.blockStatement([
            t.variableDeclaration("const", declarations),
            t.returnStatement(path.node)
        ]);
    } else {
        body = path.node;
    }

    // find for root path (Program);
    const root = getRootStatementPath(path);

    // generate memo var (actually just node) in scope
    const memoComponent = path.scope.generateUidIdentifier(getParentFunctionName(path) || "Memo");

    // register scope
    root.scope.registerDeclaration(
        root.insertBefore(
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    memoComponent,
                    // call core runtimne $$memo fn
                    t.callExpression(getImportIdentifier(ctx, path, RUNTIME_MEMO), [
                      getImportIdentifier(ctx, path, memoDefinition)
                    ])
                )
            ])
        )
    );
}

/**
 * Basically we just put all expression in Components / JSX 
 * to variables to memoize it like
 * <Component val={fn()} /> will be transform to <Component val={_values[0]} />
 * or
 * <div val={fn()} /> will be transform to <div val={_values[0]} />
 * @param {*} ctx 
 * @param {*} path 
 */
module.exports = function optimizeJSX(ctx, path) {
    path.traverse({
        JSXElement(p) {
            const memoDefinition = ctx.preset.runtime.memo;

            if(!memoDefinition) return;
            
            transformJSX(ctx, p, memoDefinition);
        },
        // Yes, fragment has different type
        JSXFragment(p) {

        } 
    });
};

const RUNTIME_MEMO = {
  name: "$$memo",
  source: "forgetti/runtime",
};


function getRootStatementPath(path) {
    let current = path.parentPath;
    while (current) {
      const next = current.parentPath;
      if (next && t.isProgram(next.node)) {
        return current;
      }
      current = next;
    }
    return path;
}

function getImportIdentifier(ctx, path, registration) {
  const name = registration.name;
  // forgetti/*[name]
  const target = `${registration.source}[${name}]`;
  // get collected states in file from ctx
  const imports = ctx.imports.get(target);
  
  // if we have key ("import") such that
  if(imports) return imports;

  const uid = createRuntimeImportDeclaration(path, registration);
  ctx.imports.set(target, uid);
  
  return uid;
}

function createRuntimeImportDeclaration(path, registration) {
  // get scope of programm node
  const programParent = path.scope.getProgramParent();
  // generate new uid with name of runtime value
  const uid = programParent.generateUidIdentifier(registration.name);

  // get path from scope node
  const newPath = programParent.path.unshiftContainer("body", t.importDeclaration(
    // specifiers
    [t.importSpecifier(uid, t.identifier(registration.name))],
    // source
    t.stringLiteral(registration.source)
  ))[0];


  programParent.registerDeclaration(newPath);

  return uid;
}


function getParentFunctionName(
  path,
) {
  let current = path;
  while (current) {
    switch (current.node.type) {
      case "FunctionDeclaration":
      case "FunctionExpression": {
        if (current.node.id) {
          return current.node.id.name;
        }
        break;
      }
      case "VariableDeclarator": {
        if (current.node.id.type === "Identifier") {
          return current.node.id.name;
        }
        break;
      }
      default:
        break;
    }
    current = current.parentPath;
  }

  return null;
}
