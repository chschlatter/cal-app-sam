import { Hono } from "hono";
import type { Variables } from "../types";
import { UsersModel as Users } from "../../model/users.model";
import { getSecret } from "../../secrets";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { bsCssColors, bsCssCDNLinks } from "src/lib/webComponents";

const i18n = require("../../i18n");

const app = new Hono<{ Variables: Variables }>();

function renderLoginForm(
  data: {
    errorMessage?: string;
    needsGoogleSignIn?: boolean;
    userName?: string;
    stayLoggedIn?: boolean;
  } = {}
): string {
  const { errorMessage, needsGoogleSignIn, userName, stayLoggedIn } = data;
  const validUser = !errorMessage && userName;
  const inputClass = validUser ? "is-valid" : errorMessage ? "is-invalid" : "";
  const feedbackClass = errorMessage ? "invalid-feedback" : "valid-feedback";
  return /* HTML */ `
    <form
      class="row g-4"
      id="login-form"
      hx-post="/login/form"
      hx-target="this"
      hx-swap="outerHTML"
    >
      <div class="col-12">
        <label>Benutzername</label>
        <div class="input-group has-validation">
          <div class="input-group-text">
            <i class="bi bi-person-fill"></i>
          </div>
          <script>
            htmx.on("#username-input", "input", function (evt) {
              htmx.removeClass(evt.target, "is-valid");
              htmx.removeClass(evt.target, "is-invalid");
              document.getElementById("name-feedback").innerText = "";
            });
          </script>
          <input
            type="text"
            autocomplete="username"
            id="username-input"
            class="form-control${inputClass ? " " + inputClass : ""}"
            placeholder="Enter username"
            aria-describedby="username-feedback"
            name="name"
            value="${userName ? userName : ""}"
            hx-trigger="keydown[key=='Enter']"
          />
        </div>
        <div id="name-feedback" class=${feedbackClass} style="display: block;">
          ${errorMessage ? errorMessage : ""}
        </div>
      </div>
      <div class="col-12">
        <input
          class="form-check-input"
          type="checkbox"
          id="stayLoggedIn"
          name="stayLoggedIn"
          ${stayLoggedIn ? "checked" : ""}
        />
        <label class="form-check-label" for="stayLoggedIn"
          >Angemeldet bleiben</label
        >
      </div>

      ${needsGoogleSignIn
        ? /* HTML */ `
            <script src="https://accounts.google.com/gsi/client" async></script>
            <div
              id="g_id_onload"
              data-client_id="526294920927-4mbsla2r4dkrk1t3if5976ss1pnvro2t.apps.googleusercontent.com"
              data-context="signin"
              data-ux_mode="popup"
              data-callback="gsiCallback"
              data-auto_prompt="false"
            ></div>
            <div>Bitte melden Sie sich mit Google an, um fortzufahren.</div>
            <div
              class="g_id_signin"
              data-type="standard"
              data-shape="rectangular"
              data-theme="outline"
              data-text="signin_with"
              data-size="large"
              data-locale="de"
              data-logo_alignment="left"
            ></div>
            <script>
              window.gsiCallback = async function gsiCallback(credResponse) {
                console.log("Google Auth Response: " + credResponse.credential);
                console.log("Username: ${userName}");

                try {
                  const credentials = {
                    name: "${userName}",
                    stayLoggedIn: ${stayLoggedIn ? "true" : "false"},
                    googleAuthJWT: credResponse.credential,
                  };

                  const response = await fetch("/api2/loginGSI", {
                    method: "post",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(credentials),
                  });
                  const data = await response.json();

                  if (response.ok) {
                    window.location.href = "/";
                    // console.log("Login successful, redirecting...");
                  } else {
                    console.error("Login failed: " + data.message);
                  }
                } catch (error) {
                  console.error("Login failed: " + error.message);
                }
              };
            </script>
          `
        : ""}

      <div class="col-12">
        <button
          type="submit"
          class="btn btn-primary px-4 float-end mt-4"
          id="login-button"
        >
          Login
        </button>
      </div>
    </form>
  `;
}

// GET / - Serve the login page
app.get("/", (c) => {
  return c.html(/* HTML */ `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Calendar Login</title>
        ${bsCssCDNLinks()} ${bsCssColors()}
        <script
          src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js"
          integrity="sha384-/TgkGk7p307TH7EXJDuUlgG3Ce1UVolAOFopFekQkkXihi5u/6OCvVKyz1W+idaz"
          crossorigin="anonymous"
        ></script>
      </head>
      <body>
        <div class="container">
          <div class="row">
            <div class="col-lg-10 offset-lg-1 mt-5">
              <div class="bg-white shadow rounded">
                <div class="row">
                  <div class="col-md-7 pe-0">
                    <div class="h-100 py-5 px-5">${renderLoginForm()}</div>
                  </div>
                  <div class="col-md-5 ps-0 d-none d-md-block">
                    <div class="h-100 bg-primary text-white text-center pt-5">
                      <h2 class="fs-1 px-1">Zürcherhaus Kalender</h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>`);
});

// POST /form - Handle login form submission
app.post("/form", async (c) => {
  const logger = c.get("logger");

  // cannot use c.req.parseBody() because of LLRT limitation with multipart/form-data
  // TODO: continue without validation for now
  const formData: Record<string, string> = {};
  const text = await c.req.text();
  const params = new URLSearchParams(text);
  for (const [key, value] of params.entries()) {
    formData[key] = value;
  }

  const userName = formData.name as string;
  const stayLoggedIn = formData.stayLoggedIn === "on";

  logger.debug("Login form submitted", { username: userName });

  // Validate user
  const usersModel = new Users();
  const user = usersModel.getUser(userName);
  if (!user) {
    logger.warn("User not found", { username: userName });
    const errorMessage = i18n.t("error.userNotFound");
    return c.html(
      renderLoginForm({
        errorMessage,
        userName,
        stayLoggedIn,
      })
    );
  }

  // Check if Google Sign-In is required
  const needsGoogleSignIn = user.role === "admin";
  if (needsGoogleSignIn) {
    logger.info("Google Sign-In required for admin user", {
      username: userName,
    });
    return c.html(
      renderLoginForm({
        needsGoogleSignIn,
        userName,
        stayLoggedIn,
      })
    );
  }

  // Create JWT token
  const jwtPayload = {
    name: user.name,
    role: user.role,
    exp:
      Math.floor(Date.now() / 1000) +
      (stayLoggedIn ? 60 * 60 * 24 * 300 : 60 * 60), // 300 days or 1 hour
  };
  logger.debug("JWT created", {
    username: user.name,
    expiresIn: stayLoggedIn ? "300 days" : "1 hour",
  });
  const token = await sign(jwtPayload, getSecret("JWT_SECRET"), "HS256");
  setCookie(c, "access_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/", // Set to root so cookie works for both /api and /api2
    maxAge: jwtPayload.exp - Math.floor(Date.now() / 1000), // Set maxAge based on exp
  });

  logger.info("User logged in successfully", { username: user.name });
  c.header("HX-Redirect", "/");
  return c.body(null, 200);
});

export default app;
