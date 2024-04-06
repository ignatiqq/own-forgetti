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

module.exports = {presets}; 