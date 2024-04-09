import react, { useMemo } from "react";

function Example (props) {
  const memoized = useMemo("123", []);
  const callback = react.useCallback("123", []);

  const cond = props.hello ? "hello" : "world";

  const value = useCustomValue(() => condition1 = 123);

  let condition1 = -12 ? 123 : "";
  if(false) return true;
  const condition2 = "" || "no" || "";
  const condiotion3 = true ? "yes": "no";

  if (condition) return;

  const greeting = props.greeting;
  const receiver = props.reveiver;

  console.log(value);
  console.log(String.toString());
  console.log(memoized);
  console.log(callback);

  const str = `${greeting}, ${receiver} ${cond}`;
  return (
    <Component val={<div val={fnn()}></div>}>
      <div val={fn()}>
        { str }
      </div>    
    </Component>
  );
}
