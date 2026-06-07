"use strict";

var _index = require("../compiler/index.js");
test("nested classes", () => {
  const compiled = (0, _index.compile)(`
.my-class .test {
  color: red;
}`);
  expect(compiled.stylesheet()).toStrictEqual({
    s: [["my-class", [{
      c: ["g:my-class"],
      s: [0]
    }]], ["test", [{
      cq: [{
        n: "g:my-class"
      }],
      d: [{
        color: "#f00"
      }],
      v: [["__rn-css-color", "#f00"]],
      s: [1, 2]
    }]]]
  });
});
test("multiple tiers classes", () => {
  const compiled = (0, _index.compile)(`
.one .two .test {
  color: red;
}`);
  expect(compiled.stylesheet()).toStrictEqual({
    s: [["one", [{
      c: ["g:one"],
      s: [0]
    }]], ["two", [{
      c: ["g:two"],
      s: [0]
    }]], ["test", [{
      cq: [{
        n: "g:one"
      }, {
        n: "g:two"
      }],
      d: [{
        color: "#f00"
      }],
      v: [["__rn-css-color", "#f00"]],
      s: [1, 3]
    }]]]
  });
});
test("tiers with multiple classes", () => {
  const compiled = (0, _index.compile)(`
.one .two.three .test {
  color: red;
}`);
  expect(compiled.stylesheet()).toStrictEqual({
    s: [["one", [{
      c: ["g:one"],
      s: [0]
    }]], ["three", [{
      c: ["g:three.two"],
      s: [0],
      aq: [["a", "className", "*=", "two"]]
    }]], ["test", [{
      cq: [{
        n: "g:one"
      }, {
        n: "g:three.two"
      }],
      d: [{
        color: "#f00"
      }],
      v: [["__rn-css-color", "#f00"]],
      s: [1, 4]
    }]]]
  });
});
//# sourceMappingURL=inheritance.test.js.map