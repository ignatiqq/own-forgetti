const t = require("@babel/types");
/**
 * Get boolean state of [IfStmt, UnaryExpr, LogicalExpr, ConditionalExpr]
 * from expressions or statement that can be only truthy or falsy
 */
function getBooleanStateOfNode(node) {
    // Check for condition test type
    switch(node.type) {
        case "BooleanLiteral":
            return node.value ? "truthy" : "falsy";
        case "NumericLiteral":
            return node.value === 0 ? "falsy" : "truthy";
        case "NullLiteral":
            return "falsy";
        case "StringLiteral":
            return node.value === "" ? "falsy" : "truthy";
        
        default: return null;
    }
}

module.exports = function simplifyExpressions(path) {
    path.traverse({
        ConditionalExpression: {
            exit(p) {
                const val = getBooleanStateOfNode(p.node.test);

                // Dont want to check Identifiers
                if(val === null) return;

                if(val === "truthy") {
                    p.replaceWith(p.node.consequent);
                } else {
                    p.replaceWith(p.node.alternate);
                }
            }
        },
        LogicalExpression: {
            exit(p) {
                const val = getBooleanStateOfNode(p.node.left);

                // Dont want to check Identifiers
                if(val === null) return;

                if(val === "falsy") {
                    // recursively move to right
                    p.replaceWith(p.node.operator === "||" ? p.node.right : p.node.left);
                } else {
                    // recursively move to right only if operator is "&&" we should check right
                    p.replaceWith(p.node.operator === "&&" ? p.node.right : p.node.left);
                }
            }
        },
        UnaryExpression: {
            exit(p) {
                const val = getBooleanStateOfNode(p.node.argument);

                // Dont want to check Identifiers
                if(val === null) return;

                switch(p.node.operator) {
                    case "!":
                        p.replaceWith(!val === "falsy" ? t.booleanLiteral(false) : t.booleanLiteral(true));
                            break;
                    case "!!":
                        p.replaceWith(val === "fasly" ? t.booleanLiteral(false) : t.booleanLiteral(true));
                            break;
                }
            }
        },
        IfStatement: {
            exit(p) {
                const val = getBooleanStateOfNode(p.node.test);

                // Dont want to check Identifiers
                if(val === null) return;
                
                if(val === "falsy") {
                    if(p.node.alternate) {
                        p.replaceWith(p.node.alternate);
                    } else {
                        p.remove();
                    }
                } else {
                    p.replaceWith(p.node.consequent);
                }
            }
        },
        WhileStatement: {
            exit(p) {
                if(getBooleanStateOfNode(p.node.test) === "falsy") {
                    return p.remove();
                }
            }
        }
    });
};