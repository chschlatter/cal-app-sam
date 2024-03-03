import {
  startRegistration,
  startAuthentication,
  WebAuthnAbortService,
} from "@simplewebauthn/browser";

export default (apiUrl) => ({
  credentials: {
    username: {
      value: "",
      invalid: false,
      errorMessage: "",
    },
    password: {
      value: "",
      invalid: false,
      errorMessage: "",
    },
    stayLoggedIn: false,
  },
  isLoading: false,
  errorMessage: "",
  passwordNeeded: false,
  tokenNeeded: false,

  async initWebauthn() {
    try {
      const authOptionsJSON = await fetch(`${apiUrl}/webauthn/authenticate`);
      const authOptions = await authOptionsJSON.json();
      const authAssertion = await startAuthentication(authOptions, true);
      const authResponseJSON = await fetch(`${apiUrl}/webauthn/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authAssertion),
      });

      console.log(authResponseJSON);
      if (authResponseJSON.ok) {
        window.location.href = "/";
      }
      // TODO: handle error
    } catch (err) {
      console.log(typeof err);
      console.log(err);
    }
  },

  async login() {
    this.isLoading = true;
    const credentials = {
      name: this.credentials.username.value,
      stayLoggedIn: this.credentials.stayLoggedIn,
    };
    this.credentials.password.value &&
      (credentials.password = this.credentials.password.value);

    try {
      this.errorMessage = "";
      // this.passwordNeeded = false;
      this.credentials.username.invalid = false;
      this.credentials.password.invalid = false;
      this.credentials.password.errorMessage = "";
      this.credentials.username.errorMessage = "";

      const response = await fetch(`${apiUrl}/login`, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();

      if (response.ok) {
        if (data.role == "admin") this.tokenNeeded = true;
        else window.location.href = "./";
      } else {
        if (response.status == 400) {
          this.tokenNeeded = false;
          switch (data.code) {
            case "auth-010":
              this.credentials.password.errorMessage = "Wrong password";
              this.credentials.password.invalid = true;
              break;
            case "auth-011":
              this.credentials.username.errorMessage = "Unknown user";
              this.credentials.username.invalid = true;
              this.credentials.password.value = "";
              this.passwordNeeded = false;
              break;
            case "auth-012":
              this.errorMessage = "Admin user must have a password";
              this.passwordNeeded = true;
              this.credentials.stayLoggedIn = false;
              break;
            default:
              this.errorMessage = data.message;
          }
        }
      }
    } catch (error) {
      console.error(error);
      this.errorMessage = error.message;
    } finally {
      this.isLoading = false;
    }
  },

  async register() {
    try {
      this.isLoading = true;
      WebAuthnAbortService.cancelCeremony();
      const resp = await fetch(`${apiUrl}/webauthn/register`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message);
      console.log(data);

      let attResp;
      try {
        attResp = await startRegistration(data);
      } catch (err) {
        console.error(err);
        this.errorMessage = err.message;
        this.isLoading = false;
        throw err;
      }

      const response = await fetch(`${apiUrl}/webauthn/register`, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attResp),
      });

      const verificationJSON = await response.json();
      console.log(JSON.stringify(verificationJSON, null, 2));

      if (verificationJSON && verificationJSON.verified) {
        this.errorMessage = "SUCCESS";
      } else {
        this.errorMessage = "Registration failed";
      }
    } catch (error) {
      console.error(error);
      this.errorMessage = error.message;
    }
  },
});
