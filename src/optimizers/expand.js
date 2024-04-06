module.exports = function expandExpressions(ctx, path) {
    path.traverse({
        CallExpression(callPath) {
            const parent = p.getFunctionParent();
            const statement = p.getStatementParent();
        }
    })
}