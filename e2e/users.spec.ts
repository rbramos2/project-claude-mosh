import { test, expect, ADMIN_EMAIL, AGENT_EMAIL } from "./fixtures/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to /users as admin and wait for the heading to appear. */
async function goToUsers(page: import("@playwright/test").Page) {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}

// ---------------------------------------------------------------------------
// List — seeded users are visible
// ---------------------------------------------------------------------------

test.describe("Users page — list", () => {
  test("shows the users table with column headers", async ({ adminPage }) => {
    await goToUsers(adminPage);

    await expect(
      adminPage.getByRole("columnheader", { name: "Name" })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("columnheader", { name: "Email" })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("columnheader", { name: "Role" })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("columnheader", { name: "Joined" })
    ).toBeVisible();
  });

  test("shows seeded admin and agent rows", async ({ adminPage }) => {
    await goToUsers(adminPage);

    await expect(
      adminPage.getByRole("cell", { name: ADMIN_EMAIL, exact: true })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("cell", { name: AGENT_EMAIL, exact: true })
    ).toBeVisible();
  });

  test("shows (you) label on the current user's own row", async ({
    adminPage,
  }) => {
    await goToUsers(adminPage);
    await expect(adminPage.getByText("(you)")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create — happy path
// ---------------------------------------------------------------------------

test.describe("Users page — create", () => {
  test("opens the New User modal when Add User is clicked", async ({
    adminPage,
  }) => {
    await goToUsers(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "New User" })
    ).toBeVisible();
  });

  test("creates a new user and they appear in the table", async ({
    adminPage,
  }) => {
    const email = `testuser-${Date.now()}@example.com`;

    await goToUsers(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();

    await adminPage.getByLabel("Name").fill("Test User");
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Create User" }).click();

    // Modal closes after successful creation
    await expect(
      adminPage.getByRole("heading", { name: "New User" })
    ).not.toBeVisible();

    // New user row appears in the table
    await expect(
      adminPage.getByRole("cell", { name: email, exact: true })
    ).toBeVisible();
  });

  test("closes the New User modal when Cancel is clicked", async ({
    adminPage,
  }) => {
    await goToUsers(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "New User" })
    ).toBeVisible();

    await adminPage.getByRole("button", { name: "Cancel" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "New User" })
    ).not.toBeVisible();
  });

  test("closes the New User modal with the Escape key", async ({
    adminPage,
  }) => {
    await goToUsers(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "New User" })
    ).toBeVisible();

    await adminPage.keyboard.press("Escape");
    await expect(
      adminPage.getByRole("heading", { name: "New User" })
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Edit — happy path
// ---------------------------------------------------------------------------

test.describe("Users page — edit", () => {
  test("opens the Edit User modal pre-populated when the pencil icon is clicked", async ({
    adminPage,
  }) => {
    await goToUsers(adminPage);

    const agentRow = adminPage
      .getByRole("row")
      .filter({ hasText: AGENT_EMAIL });
    await agentRow.getByRole("button", { name: "Edit user" }).click();

    await expect(
      adminPage.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();

    // Fields are pre-populated with the agent's data
    await expect(adminPage.getByLabel("Name")).toHaveValue("Agent");
    await expect(adminPage.getByLabel("Email")).toHaveValue(AGENT_EMAIL);
    // Password is intentionally blank in edit mode
    await expect(adminPage.getByLabel(/Password/)).toHaveValue("");
  });

  test("updates a user's name and the table reflects the change", async ({
    adminPage,
  }) => {
    // Create a throwaway user to edit so the seeded agent is not permanently mutated
    const id = Date.now();
    const originalName = `Edit Me ${id}`;
    const updatedName = `Edited ${id}`;
    const email = `editme-${id}@example.com`;

    await goToUsers(adminPage);

    // Create
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await adminPage.getByLabel("Name").fill(originalName);
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByRole("cell", { name: originalName })).toBeVisible();

    // Edit
    const createdRow = adminPage.getByRole("row").filter({ hasText: email });
    await createdRow.getByRole("button", { name: "Edit user" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();

    await adminPage.getByLabel("Name").clear();
    await adminPage.getByLabel("Name").fill(updatedName);
    await adminPage.getByRole("button", { name: "Save Changes" }).click();

    // Modal closes and updated name is visible
    await expect(
      adminPage.getByRole("heading", { name: "Edit User" })
    ).not.toBeVisible();
    await expect(adminPage.getByRole("cell", { name: updatedName })).toBeVisible();
    await expect(adminPage.getByRole("cell", { name: originalName })).not.toBeVisible();
  });

  test("closes the Edit User modal when Cancel is clicked without saving", async ({
    adminPage,
  }) => {
    await goToUsers(adminPage);

    const agentRow = adminPage
      .getByRole("row")
      .filter({ hasText: AGENT_EMAIL });
    await agentRow.getByRole("button", { name: "Edit user" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();

    await adminPage.getByRole("button", { name: "Cancel" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "Edit User" })
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Delete — happy path
// ---------------------------------------------------------------------------

test.describe("Users page — delete", () => {
  test("opens the Delete User confirmation modal when Delete is clicked", async ({
    adminPage,
  }) => {
    const id = Date.now();
    const name = `Delete Me ${id}`;
    const email = `deleteme-${id}@example.com`;

    await goToUsers(adminPage);

    // Create a throwaway user to delete
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await adminPage.getByLabel("Name").fill(name);
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByRole("cell", { name })).toBeVisible();

    // Click Delete on the new row
    const row = adminPage.getByRole("row").filter({ hasText: email });
    await row.getByRole("button", { name: "Delete" }).click();

    await expect(
      adminPage.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();
    // Confirmation copy mentions the user's name
    await expect(adminPage.getByText(name)).toBeVisible();
  });

  test("removes the user from the table after confirming deletion", async ({
    adminPage,
  }) => {
    const id = Date.now();
    const name = `To Delete ${id}`;
    const email = `todelete-${id}@example.com`;

    await goToUsers(adminPage);

    // Create
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await adminPage.getByLabel("Name").fill(name);
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByRole("cell", { name })).toBeVisible();

    // Open delete modal
    const row = adminPage.getByRole("row").filter({ hasText: email });
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();

    // Confirm deletion via the red Delete button inside the modal
    await adminPage
      .getByTestId("delete-modal-backdrop")
      .getByRole("button", { name: "Delete" })
      .click();

    // Row is removed from the table
    await expect(
      adminPage.getByRole("cell", { name: email, exact: true })
    ).not.toBeVisible();
  });

  test("keeps the user in the table when Cancel is clicked in the confirmation modal", async ({
    adminPage,
  }) => {
    const id = Date.now();
    const name = `Keep Me ${id}`;
    const email = `keepme-${id}@example.com`;

    await goToUsers(adminPage);

    // Create
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await adminPage.getByLabel("Name").fill(name);
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByRole("cell", { name })).toBeVisible();

    // Open delete modal then cancel
    const row = adminPage.getByRole("row").filter({ hasText: email });
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();

    await adminPage
      .getByTestId("delete-modal-backdrop")
      .getByRole("button", { name: "Cancel" })
      .click();

    // Modal closed, user still present in the table
    await expect(
      adminPage.getByRole("heading", { name: "Delete User" })
    ).not.toBeVisible();
    await expect(
      adminPage.getByRole("cell", { name: email, exact: true })
    ).toBeVisible();
  });

  test("does not show a Delete button for the current user's own row", async ({
    adminPage,
  }) => {
    await goToUsers(adminPage);
    const selfRow = adminPage.getByRole("row").filter({ hasText: "(you)" });
    await expect(
      selfRow.getByRole("button", { name: "Delete" })
    ).not.toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// Role change — happy path
// ---------------------------------------------------------------------------

test.describe("Users page — role change", () => {
  test("changing a user's role via the inline dropdown persists the new value", async ({
    adminPage,
  }) => {
    // Create a fresh agent user so we don't permanently mutate the seeded agent
    const id = Date.now();
    const name = `Role Test ${id}`;
    const email = `roletest-${id}@example.com`;

    await goToUsers(adminPage);

    await adminPage.getByRole("button", { name: "Add User" }).click();
    await adminPage.getByLabel("Name").fill(name);
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByRole("cell", { name })).toBeVisible();

    // New users default to "agent"
    const createdRow = adminPage.getByRole("row").filter({ hasText: email });
    const roleSelect = createdRow.locator("select");
    await expect(roleSelect).toHaveValue("agent");

    // Promote to admin
    await roleSelect.selectOption("admin");

    // Dropdown reflects the updated role after the PATCH resolves
    await expect(roleSelect).toHaveValue("admin");
  });
});
