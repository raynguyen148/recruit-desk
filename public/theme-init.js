/* Applies the saved theme before first paint to avoid a light flash in dark mode. */
(function () {
  try {
    var saved = localStorage.getItem("recruitdesk-theme");
    var dark =
      saved === "dark" ||
      (saved !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (!dark) return;
    document.documentElement.classList.add("dark");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#0e1621");
  } catch (e) {
    /* Storage can be unavailable; the app applies the theme after load. */
  }
})();
