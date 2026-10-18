/* dark mode, set before the page draws (the switch is in the menu pill); kept per computer */
try { if (localStorage.getItem("gr8-theme") === "dark" || (!localStorage.getItem("gr8-theme") && matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.classList.add("dark"); } catch (e) {}
