export default (apiUrl) => ({
  stayLoggedIn: false,
  isLoading: false,
  errorMessage: "",
  gisNeeded: false,

  async login() {
    this.isLoading = true;
    const credentials = {
      name: this.$store.username.value,
      stayLoggedIn: this.stayLoggedIn,
    };

    try {
      this.errorMessage = "";
      // this.passwordNeeded = false;
      this.$store.username.invalid = false;
      this.$store.username.errorMessage = "";

      const response = await fetch(`${apiUrl}/login`, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();

      if (response.ok) {
        window.location.href = "./";
      } else {
        switch (response.status) {
          // Not Found
          case 404:
            this.$store.username.errorMessage = data.message;
            this.$store.username.invalid = true;
            break;
          // Not Acceptable
          case 406:
            this.errorMessage = data.message;
            this.stayLoggedIn = false;
            this.gisNeeded = true;
            break;
          default:
            throw new Error(data.message);
        }
      }
    } catch (error) {
      console.error(error);
      this.errorMessage = "Interner Serverfehler.";
    } finally {
      this.isLoading = false;
    }
  },
});
