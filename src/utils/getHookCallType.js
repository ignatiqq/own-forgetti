const t = require("@babel/types");
const {isHook, isHookOrComponent} = require("./isHook");

function getHookCallTypeFromIdentifier(ctx, path, node) {
    // get identifier from somewhere, for example import {useMemo} from 'react'; === loc: {line: 1}
    const binding = path.scope.getBindingIdentifier(node.name);

    // binded at first search for hooks stage step
    if(binding) {
        const hook = ctx.registrations.hooks.identifiers.get(binding);
        if(hook) return hook.type;
    }

  return isHook(ctx, node.name) ? "custom" : "none";
}

function getHookCallTypeFromNamespace(ctx, path, object, property) {
    // find object identifier import (react) <-
    const binding = path.scope.getBindingIdentifier(object.name);

    if(!binding) return "none";

    const registrations = ctx.registrations.hooks.namespaces.get(binding);
    
    if(registrations) {
        for(let reg of registrations) {
            if(reg.name === property.name) return reg.type;
        }
    }

    return "none";
}

function getHookCallTypeFromMemberExpression(ctx, path, node) {
    // check property react.(useMemo) <-
    if(t.isIdentifier(node.property)) {
        const obj = node.object;

        // check obj (react).useMemo <-
        if(t.isIdentifier(obj)) {
            return getHookCallTypeFromNamespace(ctx, path, obj, node.property);
        }

        return isHook(ctx, node.property) ? "custom" : "none";
    }

    return "none";
}

module.exports = function getHookCallType(ctx, path) {
    const callee = path.get("callee");

    // check for identifier calls - not MemberExpr like react.useMemo();
    if(t.isIdentifier(callee.node)) {
        return getHookCallTypeFromIdentifier(ctx, path, callee.node);
    }

    if(t.isMemberExpression(callee.node)) {
        return getHookCallTypeFromMemberExpression(ctx, path, callee.node);
    }

    return "none";
};