import { User } from "../src/modules/users/user.model";

/**
 * DB-6: a duplicate userName must be refused by the database itself, because
 * the check in generateUniqueUsername leaves a window between "name is free"
 * and "user saved" that two concurrent signups can both fall into.
 */

const newUser = (email: string, userName: string) =>
  new User({ email, userName, name: "Test", password: "hashed-password" });

describe("User.userName uniqueness (DB-6)", () => {
  beforeAll(async () => {
    // Build the indexes before the first write, as the app does at startup.
    await User.init();
  });

  it("refuses a second user with the same userName", async () => {
    await newUser("first@example.com", "shared-name").save();

    await expect(
      newUser("second@example.com", "shared-name").save(),
    ).rejects.toMatchObject({
      code: 11000,
    });
    expect(await User.countDocuments({ userName: "shared-name" })).toBe(1);
  });

  it("still allows different names", async () => {
    await newUser("a@example.com", "name-a").save();
    await newUser("b@example.com", "name-b").save();

    expect(await User.countDocuments({})).toBe(2);
  });
});
