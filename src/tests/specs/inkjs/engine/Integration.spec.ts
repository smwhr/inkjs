import * as testsUtils from "../../common";

describe("Integration", () => {
  let context: testsUtils.TestContext;
  let inkPath = testsUtils.getInkPath();

  beforeEach(() => {
    context = testsUtils.makeDefaultTestContext("tests", "inkjs", true);
    context.story.allowExternalFunctionFallbacks = true;
  });

  it("should load a file", () => {
    expect(context.story.canContinue).toBe(true);
  });

  it("should jump to a knot", () => {
    context.story.ChoosePathString("knot");
    expect(context.story.canContinue).toBe(true);

    expect(context.story.Continue()).toEqual("Knot content\n");
  });

  it("should get where the context.story currently is", () => {
    context.story.ChoosePathString("knot");
    expect(context.story.state.currentPathString).toBe("knot.0");
    expect(context.story.canContinue).toBe(true);
    context.story.Continue();
    expect(context.story.state.currentPathString).toBe(null);
    expect(context.story.canContinue).toBe(false);
  });

  it("should jump to a stitch", () => {
    context.story.ChoosePathString("knot.stitch");
    expect(context.story.canContinue).toBe(true);

    expect(context.story.Continue()).toEqual("Stitch content\n");
  });

  it("should read variables from ink", () => {
    expect(context.story.variablesState["stringvar"]).toEqual("Emilia");
    expect(context.story.variablesState["intvar"]).toEqual(521);
    expect(context.story.variablesState["floatvar"]).toEqual(52.1);
    expect(context.story.variablesState["divertvar"].toString()).toEqual(
      "logic.logic_divert_dest"
    );
  });

  it("should write variables to ink", () => {
    expect(context.story.variablesState["stringvar"]).toEqual("Emilia");
    context.story.variablesState["stringvar"] = "Jonas";
    expect(context.story.variablesState["stringvar"]).toEqual("Jonas");
  });

  it("should observe variables", () => {
    context.story.ChoosePathString("integration.variable_observer");
    expect(context.story.variablesState["observedVar1"]).toEqual(1);
    expect(context.story.variablesState["observedVar2"]).toEqual(2);

    const spy1 = jasmine.createSpy("variable observer spy 1");
    const spy2 = jasmine.createSpy("variable observer spy 2");
    const commonSpy = jasmine.createSpy("variable observer spy common");
    context.story.ObserveVariable("observedVar1", spy1);
    context.story.ObserveVariable("observedVar2", spy2);
    context.story.ObserveVariable("observedVar1", commonSpy);
    context.story.ObserveVariable("observedVar2", commonSpy);

    expect(context.story.Continue()).toEqual("declared\n");

    expect(context.story.variablesState["observedVar1"]).toEqual(1);
    expect(context.story.variablesState["observedVar2"]).toEqual(2);
    expect(spy1).toHaveBeenCalledTimes(0);
    expect(spy2).toHaveBeenCalledTimes(0);
    expect(commonSpy).toHaveBeenCalledTimes(0);

    expect(context.story.Continue()).toEqual("mutated 1\n");

    expect(context.story.variablesState["observedVar1"]).toEqual(3);
    expect(context.story.variablesState["observedVar2"]).toEqual(2);
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy1).toHaveBeenCalledWith("observedVar1", 3);
    expect(spy2).toHaveBeenCalledTimes(0);
    expect(commonSpy).toHaveBeenCalledTimes(1);
    expect(commonSpy).toHaveBeenCalledWith("observedVar1", 3);

    expect(context.story.Continue()).toEqual("mutated 2\n");

    expect(context.story.variablesState["observedVar1"]).toEqual(4);
    expect(context.story.variablesState["observedVar2"]).toEqual(5);

    expect(spy1).toHaveBeenCalledTimes(2);
    expect(spy1).toHaveBeenCalledWith("observedVar1", 4);
    expect(spy2).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledWith("observedVar2", 5);
  });

  it("should increment the read count on each visit", () => {
    expect(
      context.story.state.VisitCountAtPathString("integration.visit_count")
    ).toEqual(0);

    for (let i = 0; i < 10; ++i) {
      context.story.ChoosePathString("integration.visit_count");
      expect(context.story.Continue()).toEqual("visited\n");
      expect(context.story.canContinue).toEqual(false);
      expect(
        context.story.state.VisitCountAtPathString("integration.visit_count")
      ).toEqual(i + 1);
      context.story.ChoosePathString("integration.variable_observer");
      context.story.Continue();
    }
  });

  it("should increment the read count when the callstack is reset", () => {
    expect(
      context.story.state.VisitCountAtPathString("integration.visit_count")
    ).toEqual(0);

    for (let i = 0; i < 10; ++i) {
      context.story.ChoosePathString("integration.visit_count");
      expect(context.story.Continue()).toEqual("visited\n");
      expect(
        context.story.state.VisitCountAtPathString("integration.visit_count")
      ).toEqual(i + 1);
    }
  });

  it("should not increment the read count when the callstack is not reset", () => {
    expect(
      context.story.state.VisitCountAtPathString("integration.visit_count")
    ).toEqual(0);

    for (let i = 0; i < 10; ++i) {
      context.story.ChoosePathString("integration.visit_count", false);
      expect(context.story.Continue()).toEqual("visited\n");
      expect(
        context.story.state.VisitCountAtPathString("integration.visit_count")
      ).toEqual(1);
    }
  });

  it("should call ink functions", () => {
    expect(context.story.EvaluateFunction("fn_with_return")).toEqual(
      "returned"
    );
    expect(context.story.EvaluateFunction("fn_without_return")).toBeNull();
    expect(context.story.EvaluateFunction("fn_print")).toBeNull();
    expect(context.story.EvaluateFunction("fn_calls_other")).toEqual(
      "nested function called"
    );
  });

  it("should call ink functions with params", () => {
    expect(context.story.EvaluateFunction("fn_params", ["a", "b"])).toEqual(
      "was a"
    );
    expect(context.story.EvaluateFunction("fn_echo", ["string"])).toEqual(
      "string"
    );
    expect(context.story.EvaluateFunction("fn_echo", [5])).toEqual(5);
    expect(context.story.EvaluateFunction("fn_echo", [5.3])).toEqual(5.3);
  });

  it("should return output and return value from ink function calls", () => {
    expect(context.story.EvaluateFunction("fn_print", [], true)).toEqual({
      output: "function called\n",
      returned: null,
    });
    expect(context.story.EvaluateFunction("fn_echo", ["string"], true)).toEqual(
      {
        output: "string\n",
        returned: "string",
      }
    );
    expect(context.story.EvaluateFunction("fn_echo", [5], true)).toEqual({
      output: "5\n",
      returned: 5,
    });
    expect(context.story.EvaluateFunction("fn_echo", [5.3], true)).toEqual({
      output: "5.3\n",
      returned: 5.3,
    });
  });

  it("should call external functions", () => {
    context.story.allowExternalFunctionFallbacks = false;
    context.story.ChoosePathString("integration.external");
    const externalSpy = jasmine
      .createSpy("external function spy", (a) => {
        return a;
      })
      .and.callThrough();
    context.story.BindExternalFunction("fn_ext", externalSpy);
    context.story.BindExternalFunction("gameInc", () => undefined);

    expect(context.story.ContinueMaximally()).toEqual("1\n1.1\na\na\n");
    expect(externalSpy).toHaveBeenCalledWith(1, 2, 3);
    expect(externalSpy).toHaveBeenCalledWith(1.1, 2.2, 3.3);
    expect(externalSpy).toHaveBeenCalledWith("a", "b", "c");
    expect(externalSpy).toHaveBeenCalledWith("a", 1, 2.2);
  });

  it("should handle callstack changes", () => {
    context.story.allowExternalFunctionFallbacks = false;
    const externalSpy = jasmine
      .createSpy("external function spy", (x) => {
        x++;
        x = parseInt(context.story.EvaluateFunction("inkInc", [x]));
        return x;
      })
      .and.callThrough();
    context.story.BindExternalFunction("fn_ext", () => undefined);
    context.story.BindExternalFunction("gameInc", externalSpy);

    const result = context.story.EvaluateFunction("topExternal", [5], true);

    expect(parseInt(result.returned)).toEqual(7);
    expect(result.output).toEqual("In top external\n");
  });

  it("should return a visit count", () => {
    expect(
      context.story.state.VisitCountAtPathString("game_queries.turnssince")
    ).toEqual(0);

    context.story.ChoosePathString("game_queries.turnssince");
    context.story.Continue();
    expect(
      context.story.state.VisitCountAtPathString("game_queries.turnssince")
    ).toEqual(1);

    context.story.ChoosePathString("game_queries.turnssince_1");
    context.story.Continue();
    context.story.ChoosePathString("game_queries.turnssince");
    context.story.Continue();
    expect(
      context.story.state.VisitCountAtPathString("game_queries.turnssince")
    ).toEqual(2);
  });

  describe("Saving and Loading", () => {
    it("should continue the context.story", () => {
      context.story.ChoosePathString("saveload");
      expect(context.story.Continue()).toEqual("a bit of content\n");
      const save = context.story.state.ToJson();
      context.story.state.LoadJson(save);
      expect(context.story.Continue()).toEqual("the next bit\n");
    });

    it("should restore a choice point", () => {
      context.story.ChoosePathString("saveload.choicepoint");
      context.story.Continue();
      expect(context.story.currentChoices.length).toEqual(2);
      expect(context.story.currentChoices[0].text).toEqual("choice 1");
      expect(context.story.currentChoices[1].text).toEqual("choice 2");

      const save = context.story.state.ToJson();
      context.story.state.LoadJson(save);

      expect(context.story.currentChoices.length).toEqual(2);
      expect(context.story.currentChoices[0].text).toEqual("choice 1");
      expect(context.story.currentChoices[1].text).toEqual("choice 2");
    });
  });

  describe("debug tools", () => {
    it("should return a string of hierarchy", () => {
      expect(context.story.BuildStringOfHierarchy()).toBeDefined();
    });
  });

  describe("Exported classes", () => {
    if (inkPath) {
      // JavaScript-only spec
      let inkjs = require(inkPath); // eslint-disable-line @typescript-eslint/no-var-requires

      it("should expose the context.story class", () => {
        expect(inkjs.context.story).toBeDefined();
      });

      it("should expose the InkList class", () => {
        expect(inkjs.InkList).toBeDefined();
      });
    }
  });
});
