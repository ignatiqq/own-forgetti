function isHook(ctx, name) {
    return ctx.filters.hook.source.test(name);
  }
  
function isHookOrComponent (ctx, name) {
    return ctx.filters.component.source.test(name) || isHook(ctx, name);
}

module.exports = {isHook, isHookOrComponent};