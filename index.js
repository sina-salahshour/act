class Dependency {
  constructor(subscriptions) {
    this.subscriptions = subscriptions;
  }
}

class _State {
  Context = [];
  ContextDeps = null;
}
const State = new _State();

function $state(value) {
  const dependency = new Dependency(new Set());
  function setter(nextValue) {
    value = nextValue;
    reactSubscribers();
  }

  function getter() {
    if (State.Context.length && State.ContextDeps != null) {
      State.ContextDeps.push(Dependency);
      dependency.subscriptions.add(State.Context.at(-1));
    }
    return value;
  }

  function reactSubscribers() {
    const subs = new Set(dependency.subscriptions);
    dependency.subscriptions.clear();
    for (const subscriber of subs) {
      subscriber();
    }
  }
  return [getter, setter];
}

function $effect(cb) {
  let previousDependencies = [];
  let dependencies = [];

  function execute() {
    try {
      [dependencies, State.ContextDeps] = [State.ContextDeps, dependencies];
      State.Context.push(execute);
      cb();
    } finally {
      State.Context.pop();
      [dependencies, State.ContextDeps] = [State.ContextDeps, dependencies];
      for (const dependency of previousDependencies) {
        if (dependencies != null && !dependencies.includes(dependency)) {
          dependency.subscriptions.remove(execute);
        }
      }
      previousDependencies = [];
      [dependencies, previousDependencies] = [
        previousDependencies,
        dependencies,
      ];
    }
  }

  execute();
}

function $memo(cb) {
  let prevRes;
  let res;
  const [value, setValue] = $state(undefined);

  $effect(() => {
    prevRes = res;
    res = cb();

    if (res != prevRes) {
      setValue(res);
    }
  });

  return value;
}
function untrack(cb) {
  let tmp = [];
  [tmp, State.Context] = [State.Context, tmp];
  try {
    return cb();
  } finally {
    [tmp, State.Context] = [State.Context, tmp];
  }
}
function element(name, props = {}, children = []) {
  props = props ?? {};
  const elem = document.createElement(name);
  children.forEach((child) => {
    if (child == null) {
      return;
    }
    if (
      typeof child === "string" ||
      typeof child === "number" ||
      typeof child === "boolean"
    ) {
      if (child === false) {
        return;
      }
      const node = document.createTextNode(child.toString());
      elem.appendChild(node);
    } else {
      if (typeof child === "function") {
        child = $reactive(child);
      }
      elem.appendChild(child);
    }
  });
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith("on")) {
      let eventKey = key.slice(2);
      elem.addEventListener(eventKey, value);
    } else {
      if (typeof value === "function") {
        $effect(() => {
          const evaluatedValue = value();
          if (evaluatedValue == null) {
            elem.removeAttribute(key);
            return;
          }
          elem.setAttribute(key, evaluatedValue);
        });
      } else {
        if (value == null) {
          elem.removeAttribute(key);
          return;
        }
        elem.setAttribute(key, value);
      }
    }
  });
  return elem;
}

function node(value = "") {
  const res = document.createTextNode(value);
  return res;
}

function $reactive(cb) {
  let prevNode;
  $effect(() => {
    function getCbElem() {
      let res = cb();
      if (typeof res !== "object") {
        res = node(res);
      }
      return res;
    }
    if (prevNode == null) {
      prevNode = getCbElem();
    } else {
      const newNode = getCbElem();
      prevNode.replaceWith(newNode);
      prevNode = newNode;
    }
  });
  return prevNode;
}

function render(elem, selector) {
  const rootElem = document.querySelector(selector);
  rootElem.appendChild(elem);
}

const h = element;
const n = node;
// -- Code Start

function Root() {
  const [count, setCount] = $state(0);
  const [text, setText] = $state("");
  const [showOdds, setShowOdds] = $state(false);
  const isInputChecked = $memo(() => (showOdds() ? true : undefined));
  const toggleButtonText = () => (showOdds() ? "true" : "false");

  $effect(() => {
    console.log("count is ", count());
    // setShowOdds(!untrack(showOdds));
  });

  function toggleOdds() {
    setShowOdds(!showOdds());
  }
  const button = h(
    "button",
    {
      onclick: () => setCount(count() + 1),
    },
    ["hi ", count],
  );
  button.classList.add("test");

  return h("div", null, [
    button,
    h("br"),
    h("input", {
      type: "text",
      oninput: (e) => setText(e.target.value),
      class: text,
    }),
    h("h3", null, ["the text is:", text]),

    h(
      "button",
      {
        onclick: toggleOdds,
      },
      ["showOdds: ", toggleButtonText],
    ),

    h("input", {
      type: "checkbox",
      checked: isInputChecked,
      disabled: "true",
    }),
    List({ count: count, showOdds }),
  ]);
}
function List({ count, showOdds }) {
  return () =>
    h(
      "ul",
      null,
      Array.from({ length: count() }, (_, index) => index)
        .filter((item) => showOdds() || item % 2 != 1)
        .map((item) => h("li", { onclick: () => alert("hi" + item) }, [item])),
    );
}

render(Root(), "#root");
