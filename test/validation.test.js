const {userSchema} = require("../validation/userSchema");
const {taskSchema, patchTaskSchema} = require("../validation/taskSchema");

describe("user object validation tests", () => {
  it("1. doesn't permit a trivial password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com", password: "password" },
      { abortEarly: false }
    );
    expect(
      error.details.find(d => d.context.key === "password")
    ).toBeDefined();
  });
  it("2. requires an email", () => {
    const { error } = userSchema.validate(
      { name: "Bob", password: "Pa$$word20" },
      { abortEarly: false }
    );
    expect(
      error.details.find(detail => detail.context.key === "email")
    ).toBeDefined();
  });

  it("3. does not accept an invalid email", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "not-an-email", password: "Pa$$word20" },
      { abortEarly: false }
    );

    expect(
      error.details.find(detail => detail.context.key === "email")
    ).toBeDefined();
  });

  it("4. requires a password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com" },
      { abortEarly: false }
    );

    expect(
      error.details.find(detail => detail.context.key === "password")
    ).toBeDefined();
  });

  it("5. requires a name", () => {
    const { error } = userSchema.validate(
      { email: "bob@sample.com", password: "Pa$$word20" },
      { abortEarly: false }
    );

    expect(
      error.details.find(detail => detail.context.key === "name")
    ).toBeDefined();
  });

  it("6. name must be between 3 and 30 characters", () => {
    const { error } = userSchema.validate(
      { name: "Bo", email: "bob@sample.com", password: "Pa$$word20" },
      { abortEarly: false }
    );

    expect(
      error.details.find(detail => detail.context.key === "name")
    ).toBeDefined();
  });

  it("7. valid user object returns no error", () => {
    const { error } = userSchema.validate(
      { name: "Bobby", email: "bob@sample.com", password: "Pa$$word20" },
      { abortEarly: false }
    );

    expect(error).toBeFalsy();
  });

});

describe("task object validation tests", () => {
  it("8. requires a title", () => {
    const { error } = taskSchema.validate(
      {},
      { abortEarly: false }
    );

    expect(
      error.details.find(detail => detail.context.key === "title")
    ).toBeDefined();
  });

  it("9. isCompleted must be valid if provided", () => {
    const { error } = taskSchema.validate(
      { title: "Test task", isCompleted: "yes" },
      { abortEarly: false }
    );

    expect(
      error.details.find(detail => detail.context.key === "isCompleted")
    ).toBeDefined();
  });

  it("10. isCompleted defaults to false if not provided", () => {
    const { value } = taskSchema.validate(
      { title: "Test task" },
      { abortEarly: false }
    );

    expect(value.isCompleted).toBe(false);
  });

  it("11. isCompleted remains true if provided as true", () => {
    const { value } = taskSchema.validate(
      { title: "Test task", isCompleted: true },
      { abortEarly: false }
    );

    expect(value.isCompleted).toBe(true);
  });
});


describe("patch task object validation tests", () => {
  it("12. does not require a title", () => {
    const { error } = patchTaskSchema.validate(
      { isCompleted: true },
      { abortEarly: false }
    );

    expect(error).toBeFalsy();
  });

  it("13. isCompleted remains undefined if not provided", () => {
    const { value } = patchTaskSchema.validate(
      {},
      { abortEarly: false }
    );

    expect(value.isCompleted).toBeUndefined();
  });
});
