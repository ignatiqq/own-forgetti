const t = require("@babel/types");
const {isPathNodeValid} = require("../utils/utils");
const getHookCallType = require("../utils/getHookCallType");

module.exports = function expandExpressions(ctx, path) {
    path.traverse({
        
        CallExpression(p) {
            const parent = p.getFunctionParent();
            const statement = p.getStatementParent();

            if (
                // проверяем вызов из блока компонента
                parent === path &&
                // Проверки пройдут только в кейсе заинлайненых значений
                // const val = useCallback(); <- var declarator <- invalid
                // useCallback(); / fn(useCallback()) <- valid

                // не props.h() // Expression statement
                !isPathNodeValid(p.parentPath, t.isStatement) &&
                // не let memoized = useMemo('123') // VariableDeclarator
                !isPathNodeValid(p.parentPath, t.isVariableDeclarator)
            ) {
                // define hook type: custom or react's from preset like "memo"
                const hookType = getHookCallType(ctx, p);
                if(hookType === "custom") {
                    // create name in scope
                    const id = p.scope.generateUidIdentifier("hoisted");
                    // create node in the scope
                    statement.scope.registerDeclaration(
                        // put before expression
                        statement.insertBefore(
                            // create var node
                            t.variableDeclaration("let", [t.variableDeclarator(id, p.node)])
                        )[0]
                    );
                    // replace hook call on identifier "id"
                    p.replaceWith(id);
                }
            }
        }
    });
};