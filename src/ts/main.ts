// Mobile menu toggle
const menuToggle = document.getElementById(
  "menuToggle",
) as HTMLButtonElement | null;
const siteNav = document.getElementById("siteNav") as HTMLElement | null;
if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav.style.display = expanded ? "none" : "flex";
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = (e.currentTarget as HTMLAnchorElement).getAttribute("href");
    if (href && href.startsWith("#")) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // close mobile menu
        if (window.innerWidth < 768 && menuToggle && siteNav) {
          menuToggle.setAttribute("aria-expanded", "false");
          siteNav.style.display = "none";
        }
      }
    }
  });
});

// Form validation and real email submit
const form = document.getElementById("contactForm") as HTMLFormElement | null;
const statusEl = document.getElementById("formStatus") as HTMLElement | null;
if (form) {
  const submitButton = form.querySelector(
    'button[type="submit"]',
  ) as HTMLButtonElement | null;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (
      document.getElementById("name") as HTMLInputElement
    ).value.trim();
    const phone = (
      document.getElementById("phone") as HTMLInputElement
    ).value.trim();
    const email = (
      document.getElementById("email") as HTMLInputElement
    ).value.trim();
    const message = (
      document.getElementById("message") as HTMLTextAreaElement
    ).value.trim();

    const phoneClean = phone.replace(/\s|\+|-/g, "");
    const phoneValid = /^[0-9]{6,15}$/.test(phoneClean);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name) {
      statusEl && (statusEl.textContent = "Vă rugăm introduceți numele.");
      return;
    }
    if (!phoneValid) {
      statusEl &&
        (statusEl.textContent = "Telefon invalid. Folosiți doar cifre.");
      return;
    }
    if (!emailValid) {
      statusEl && (statusEl.textContent = "Email invalid.");
      return;
    }
    if (!message) {
      statusEl && (statusEl.textContent = "Vă rugăm adăugați un mesaj.");
      return;
    }

    statusEl && (statusEl.textContent = "Se trimite mesajul...");
    submitButton && (submitButton.disabled = true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone: phoneClean,
          email,
          message,
          source: location.href,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Nu am putut trimite mesajul.");
      }

      statusEl &&
        (statusEl.textContent = "Mesaj trimis. Vă contactăm în curând.");
      form.reset();
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : "Nu am putut trimite mesajul. Verificați configurarea serverului.";
      statusEl && (statusEl.textContent = messageText);
    } finally {
      submitButton && (submitButton.disabled = false);
    }
  });
}

// Accessibility: ensure nav is visible on resize when large
window.addEventListener("resize", () => {
  if (window.innerWidth >= 768 && siteNav) {
    siteNav.style.display = "flex";
  } else if (
    siteNav &&
    menuToggle &&
    menuToggle.getAttribute("aria-expanded") === "false"
  ) {
    siteNav.style.display = "none";
  }
});

export {};
