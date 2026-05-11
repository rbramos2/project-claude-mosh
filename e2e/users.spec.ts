import { test, expect, ADMIN_EMAIL, ADMIN_NAME, AGENT_EMAIL, AGENT_NAME } from "./fixtures/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to /users and wait for the table to be visible. */
async function goToUsersPage(page: import("@playwright/test").Page) {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  // Wait until the loading state resolves — "Loading..." disappears and the
  // table (or "No users found" empty state) appears.
  await expect(page.getByText("Loading...")).not.toBeVisible();
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

test.describe("Users page — access control", () => {
  test("admin can access /users", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    await expect(adminPage).toHaveURL("/users");
  });

  test("agent visiting /users is redirected to /", async ({ agentPage }) => {
    await agentPage.goto("/users");
    await agentPage.waitForURL("/");
    await expect(agentPage).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// User list display
// ---------------------------------------------------------------------------

test.describe("Users page — list display", () => {
  test("shows the seeded admin and agent rows", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    await expect(adminPage.getByRole("cell", { name: ADMIN_EMAIL, exact: true })).toBeVisible();
    await expect(adminPage.getByRole("cell", { name: AGENT_EMAIL, exact: true })).toBeVisible();
  });

  test("shows the admin email in the table", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    await expect(adminPage.getByRole("cell", { name: ADMIN_EMAIL, exact: true })).toBeVisible();
  });

  test("shows the agent email in the table", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    await expect(adminPage.getByRole("cell", { name: AGENT_EMAIL })).toBeVisible();
  });

  test("shows (you) label on the admin's own row", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    // The "(you)" label sits in the same cell as the admin name
    await expect(adminPage.getByText("(you)")).toBeVisible();
  });

  test("table has the expected column headers", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    const headers = adminPage.getByRole("columnheader");
    await expect(headers.getByText("Name")).toBeVisible();
    await expect(headers.getByText("Email")).toBeVisible();
    await expect(headers.getByText("Role")).toBeVisible();
    await expect(headers.getByText("Joined")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Self-row restrictions
// ---------------------------------------------------------------------------

test.describe("Users page — self-row restrictions", () => {
  test("own row shows a static role badge, not a role dropdown", async ({
    adminPage,
  }) => {
    await goToUsersPage(adminPage);

    // Find the row that contains "(you)"
    const selfRow = adminPage.getByRole("row").filter({ hasText: "(you)" });

    // The role badge is a <span>, not a <select>
    await expect(selfRow.locator("span", { hasText: /admin/i })).toBeVisible();
    await expect(selfRow.locator("select")).not.toBeAttached();
  });

  test("own row does not have a Delete button", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    const selfRow = adminPage.getByRole("row").filter({ hasText: "(you)" });
    await expect(selfRow.getByRole("button", { name: "Delete" })).not.toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// Add User form — toggle
// ---------------------------------------------------------------------------

test.describe("Users page — Add User form toggle", () => {
  test("Add User button shows the inline form", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await expect(adminPage.getByRole("heading", { name: "New User" })).toBeVisible();
  });

  test("Cancel button hides the form", async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await expect(adminPage.getByRole("heading", { name: "New User" })).toBeVisible();

    await adminPage.getByRole("button", { name: "Cancel" }).click();
    await expect(adminPage.getByRole("heading", { name: "New User" })).not.toBeVisible();
  });

  test("Add User button label toggles to Cancel when form is open", async ({
    adminPage,
  }) => {
    await goToUsersPage(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await expect(adminPage.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(adminPage.getByRole("button", { name: "Add User" })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create user — happy path
// ---------------------------------------------------------------------------

test.describe("Users page — create user", () => {
  test("successfully creates a new agent user and shows them in the table", async ({
    adminPage,
  }) => {
    const email = `testuser-${Date.now()}@example.com`;
    await goToUsersPage(adminPage);

    await adminPage.getByRole("button", { name: "Add User" }).click();
    await expect(adminPage.getByRole("heading", { name: "New User" })).toBeVisible();

    await adminPage.getByLabel("Name").fill("Test User");
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    // Role defaults to "agent" — no need to change

    await adminPage.getByRole("button", { name: "Create User" }).click();

    // Form should close on success
    await expect(adminPage.getByRole("heading", { name: "New User" })).not.toBeVisible();

    // New row should appear in the table
    await expect(adminPage.getByRole("cell", { name: email, exact: true })).toBeVisible();
  });

  test("successfully creates a new admin user", async ({ adminPage }) => {
    const email = `newadmin-${Date.now()}@example.com`;
    await goToUsersPage(adminPage);

    await adminPage.getByRole("button", { name: "Add User" }).click();

    await adminPage.getByLabel("Name").fill("New Admin");
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByLabel("Role").selectOption("admin");

    await adminPage.getByRole("button", { name: "Create User" }).click();

    await expect(adminPage.getByRole("heading", { name: "New User" })).not.toBeVisible();
    await expect(adminPage.getByRole("cell", { name: "New Admin" })).toBeVisible();
    await expect(adminPage.getByRole("cell", { name: email, exact: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create user — client-side validation errors
// ---------------------------------------------------------------------------

test.describe("Users page — create user validation", () => {
  test.beforeEach(async ({ adminPage }) => {
    await goToUsersPage(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
  });

  test("shows name required error when name is empty", async ({ adminPage }) => {
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByText("Name is required")).toBeVisible();
  });

  test("shows email required error when email is empty", async ({ adminPage }) => {
    await adminPage.getByLabel("Name").fill("Someone");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByText("Email is required")).toBeVisible();
  });

  test("shows invalid email error for malformed email", async ({ adminPage }) => {
    await adminPage.getByLabel("Name").fill("Someone");
    await adminPage.getByLabel("Email").fill("not-an-email");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByText("Enter a valid email")).toBeVisible();
  });

  test("shows password required / too short error when password is empty", async ({
    adminPage,
  }) => {
    await adminPage.getByLabel("Name").fill("Someone");
    await adminPage.getByLabel("Email").fill("someone@example.com");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByText("Password must be at least 8 characters")).toBeVisible();
  });

  test("shows too short error when password is fewer than 8 characters", async ({
    adminPage,
  }) => {
    await adminPage.getByLabel("Name").fill("Someone");
    await adminPage.getByLabel("Email").fill("someone@example.com");
    await adminPage.getByLabel("Password").fill("abc");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByText("Password must be at least 8 characters")).toBeVisible();
  });

  test("shows all field errors at once on a fully empty submission", async ({
    adminPage,
  }) => {
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByText("Name is required")).toBeVisible();
    await expect(adminPage.getByText("Email is required")).toBeVisible();
    await expect(adminPage.getByText("Password must be at least 8 characters")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create user — duplicate email (server-side error)
// ---------------------------------------------------------------------------

test.describe("Users page — duplicate email error", () => {
  test("shows server error when creating a user with an existing email", async ({
    adminPage,
  }) => {
    await goToUsersPage(adminPage);

    await adminPage.getByRole("button", { name: "Add User" }).click();

    // ADMIN_EMAIL already exists in the seeded DB
    await adminPage.getByLabel("Name").fill("Duplicate User");
    await adminPage.getByLabel("Email").fill(ADMIN_EMAIL);
    await adminPage.getByLabel("Password").fill("password123");

    await adminPage.getByRole("button", { name: "Create User" }).click();

    await expect(
      adminPage.getByText("A user with this email already exists")
    ).toBeVisible();

    // Form stays open so the user can correct the email
    await expect(adminPage.getByRole("heading", { name: "New User" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Role change
// ---------------------------------------------------------------------------

test.describe("Users page — role change", () => {
  test("changing an agent's role to admin updates the dropdown", async ({
    adminPage,
  }) => {
    await goToUsersPage(adminPage);

    // Find the agent row (not the self row) and locate its role dropdown
    const agentRow = adminPage
      .getByRole("row")
      .filter({ hasText: AGENT_EMAIL });

    const roleDropdown = agentRow.locator("select");
    await expect(roleDropdown).toHaveValue("agent");

    await roleDropdown.selectOption("admin");

    // After the PATCH completes the dropdown should reflect the new value
    await expect(roleDropdown).toHaveValue("admin");
  });

  test("changing an agent's role back to agent works", async ({ adminPage }) => {
    await goToUsersPage(adminPage);

    const agentRow = adminPage
      .getByRole("row")
      .filter({ hasText: AGENT_EMAIL });

    const roleDropdown = agentRow.locator("select");

    // First promote to admin
    await roleDropdown.selectOption("admin");
    await expect(roleDropdown).toHaveValue("admin");

    // Then demote back
    await roleDropdown.selectOption("agent");
    await expect(roleDropdown).toHaveValue("agent");
  });
});

// ---------------------------------------------------------------------------
// Delete user
// ---------------------------------------------------------------------------

test.describe("Users page — delete user", () => {
  test("deleting a user removes their row from the table", async ({
    adminPage,
  }) => {
    const email = `deletable-${Date.now()}@example.com`;
    await goToUsersPage(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await adminPage.getByLabel("Name").fill("Deletable User");
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByRole("cell", { name: email, exact: true })).toBeVisible();

    adminPage.once("dialog", (dialog) => dialog.accept());

    const deletableRow = adminPage
      .getByRole("row")
      .filter({ has: adminPage.locator("td", { hasText: new RegExp(`^${email}$`) }) });
    await deletableRow.getByRole("button", { name: "Delete" }).click();

    await expect(adminPage.getByRole("cell", { name: email, exact: true })).not.toBeVisible();
  });

  test("dismissing the confirm dialog does not delete the user", async ({
    adminPage,
  }) => {
    const email = `keepme-${Date.now()}@example.com`;
    await goToUsersPage(adminPage);
    await adminPage.getByRole("button", { name: "Add User" }).click();
    await adminPage.getByLabel("Name").fill("Keep Me");
    await adminPage.getByLabel("Email").fill(email);
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Create User" }).click();
    await expect(adminPage.getByRole("cell", { name: email, exact: true })).toBeVisible();

    adminPage.once("dialog", (dialog) => dialog.dismiss());

    const keepRow = adminPage
      .getByRole("row")
      .filter({ has: adminPage.locator("td", { hasText: new RegExp(`^${email}$`) }) });
    await keepRow.getByRole("button", { name: "Delete" }).click();

    await expect(adminPage.getByRole("cell", { name: email, exact: true })).toBeVisible();
  });

  test("the seeded admin's own row has no Delete button", async ({
    adminPage,
  }) => {
    await goToUsersPage(adminPage);
    const selfRow = adminPage.getByRole("row").filter({ hasText: "(you)" });
    await expect(selfRow.getByRole("button", { name: "Delete" })).not.toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// API error simulation
// ---------------------------------------------------------------------------

test.describe("Users page — API error handling", () => {
  test("shows error message when the user list fetch fails", async ({
    adminPage,
  }) => {
    await adminPage.route("**/api/users", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await adminPage.goto("/users");
    await expect(adminPage.getByRole("heading", { name: "Users" })).toBeVisible();
    // Should display some error text (the component renders fetchError)
    await expect(adminPage.getByText(/internal server error/i)).toBeVisible();
  });
});
