const button = document.getElementById("ping");
const message = document.getElementById("message");

button?.addEventListener("click", () => {
  if (message) message.textContent = `Hello from LucyN UI — ${new Date().toLocaleTimeString()}`;
});
