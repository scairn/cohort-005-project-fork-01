// Rules from CODING_STANDARDS.md that a parser can check. Each rule's name
// matches the heading it enforces. .oxlintrc.json scopes each one to the files
// its standard covers.

const isZeroArgMethodCall = (node, names) =>
  node.arguments.length === 0 &&
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  names.includes(node.callee.property.name);

// "Inject the clock": a module takes the time as an argument.
const injectClock = {
  meta: {
    type: "problem",
    messages: {
      ambient:
        "Take the time as an argument instead of reading the clock here (CODING_STANDARDS.md: Inject the clock).",
    },
  },
  create(context) {
    return {
      NewExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "Date" &&
          node.arguments.length === 0
        ) {
          context.report({ node, messageId: "ambient" });
        }
      },
      CallExpression(node) {
        if (
          isZeroArgMethodCall(node, ["now"]) &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "Date"
        ) {
          context.report({ node, messageId: "ambient" });
        }
      },
    };
  },
};

// "Parse untrusted input with a schema, at the edge": route params, form data
// and search params go through zod, never Number().
const isRequestInput = (node) => {
  if (
    node.type === "MemberExpression" &&
    node.object.type === "Identifier" &&
    node.object.name === "params"
  ) {
    return true;
  }
  return (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    node.callee.property.name === "get" &&
    node.callee.object.type === "Identifier" &&
    /formData|searchParams/i.test(node.callee.object.name)
  );
};

const parseWithSchema = {
  meta: {
    type: "problem",
    messages: {
      number:
        'Parse request input with a zod schema (z.coerce.number()), not Number(): Number("") is 0 (CODING_STANDARDS.md: Parse untrusted input with a schema, at the edge).',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const [arg] = node.arguments;
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "Number" &&
          arg &&
          isRequestInput(arg)
        ) {
          context.report({ node, messageId: "number" });
        }
      },
    };
  },
};

// "Do not read from the database in a loop": a drizzle read is a select chain
// ending in a zero-argument .all() or .get(). One inside a loop, or inside a
// callback passed to an array method, runs once per item. Writes in a loop are
// left alone: the standard is about reads.
const LOOPS = new Set([
  "ForStatement",
  "ForOfStatement",
  "ForInStatement",
  "WhileStatement",
  "DoWhileStatement",
]);
const ITERATORS = [
  "map",
  "flatMap",
  "forEach",
  "filter",
  "reduce",
  "some",
  "every",
  "find",
];

const isIteratorCallback = (fn) =>
  fn.parent?.type === "CallExpression" &&
  fn.parent.arguments.includes(fn) &&
  fn.parent.callee.type === "MemberExpression" &&
  !fn.parent.callee.computed &&
  ITERATORS.includes(fn.parent.callee.property.name);

const isInLoop = (node) => {
  for (let current = node.parent; current; current = current.parent) {
    if (LOOPS.has(current.type)) return true;
    const isFunction =
      current.type === "ArrowFunctionExpression" ||
      current.type === "FunctionExpression" ||
      current.type === "FunctionDeclaration";
    if (isFunction) return isIteratorCallback(current);
  }
  return false;
};

const isSelectChain = (call) => {
  for (let node = call.callee; node; ) {
    if (node.type === "MemberExpression") {
      if (!node.computed && /^select/.test(node.property.name)) return true;
      node = node.object;
    } else if (node.type === "CallExpression") {
      node = node.callee;
    } else {
      return false;
    }
  }
  return false;
};

const noQueryInLoop = {
  meta: {
    type: "problem",
    messages: {
      loop: "This query runs once per item. Use a join, or one query with inArray() (CODING_STANDARDS.md: Do not read from the database in a loop).",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          isZeroArgMethodCall(node, ["all", "get"]) &&
          isSelectChain(node) &&
          isInLoop(node)
        ) {
          context.report({ node, messageId: "loop" });
        }
      },
    };
  },
};

export default {
  meta: { name: "standards" },
  rules: {
    "inject-clock": injectClock,
    "parse-with-schema": parseWithSchema,
    "no-query-in-loop": noQueryInLoop,
  },
};
