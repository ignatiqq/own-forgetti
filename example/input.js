import React, { useMemo } from "react";

function Example (props) {
  const memoized = useMemo("123", []);

  const cond = props.hello ? 'hello' : 'world';

  const condition1 = -12 ? 123 : '';
  if(false) return true;
  const condition2 = '' || 'no' || '';
  const condiotion3 = true ? 'yes': 'no';

  if (condition) return;

  const greeting = props.greeting;
  const receiver = props.reveiver;

  console.log(memoized);

  const str = `${greeting}, ${receiver} ${cond}`;
  return (
    <div>
        { str }
    </div>
  );
}
