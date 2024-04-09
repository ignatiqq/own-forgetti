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
            console.log("???", state.jsx);
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

function transformJSX(ctx, path) {
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

    // generate memo var (actually just node) in scope
    const memoComponent = path.scope.generateUidIdentifier(getParentFunctionName(path) || "Memo");

    console.log("state after extracting \n\n\n: ", state);
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
            
            transformJSX(ctx, p);
        },
        // Yes, fragment has different type
        JSXFragment(p) {

        } 
    });
};






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
