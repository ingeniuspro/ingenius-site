// Simplified header behavior: always show nav links like desktop on mobile
var menuToggle = document.getElementById("menuToggle");
var siteNav = document.getElementById("siteNav");
if (siteNav) {
  siteNav.style.display = "flex";
}
if (menuToggle) {
  // hide hamburger because links are visible in header
  menuToggle.style.display = "none";
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener("click", function (e) {
    var href = e.currentTarget.getAttribute("href");
    if (href && href.startsWith("#")) {
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // mobile: no off-canvas to close
      }
    }
  });
});

// Form validation and real email submit
var form = document.getElementById("contactForm");
var statusEl = document.getElementById("formStatus");
if (form) {
  var submitButton = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var name = document.getElementById("name").value.trim();
    var phone = document.getElementById("phone").value.trim();
    var email = document.getElementById("email").value.trim();
    var message = document.getElementById("message").value.trim();
    var phoneClean = phone.replace(/\s|\+|-/g, "");
    var phoneValid = /^[0-9]{6,15}$/.test(phoneClean);
    var emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
      // If formSendMethod is set to 'mailto', build a mailto: link and open user's email client
      if (window.formSendMethod === "mailto") {
        var toAddr = "ingeniuspro@yahoo.com";
        var subject = "Mesaj INGENIUS PRO: " + name;
        var body =
          "Nume: " +
          name +
          "\nTelefon: " +
          phoneClean +
          "\nEmail: " +
          email +
          "\n\nMesaj:\n" +
          message;
        var mailto =
          "mailto:" +
          encodeURIComponent(toAddr) +
          "?subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(body);
        statusEl && (statusEl.textContent = "Se deschide clientul de email...");
        // try to open mail client
        try {
          window.location.href = mailto;
        } catch (err) {
          try {
            window.open(mailto);
          } catch (e) {
            // ignore
          }
        }
        submitButton && (submitButton.disabled = false);
        return;
      }

      // If EmailJS is configured on the page, use it (client-side send)
      if (
        window.emailjs &&
        window.emailjsConfig &&
        window.emailjsConfig.serviceId &&
        window.emailjsConfig.templateId &&
        window.emailjsConfig.publicKey &&
        window.emailjsConfig.templateId !== "YOUR_EMAILJS_TEMPLATE_ID" &&
        window.emailjsConfig.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY"
      ) {
        // initialize EmailJS (public key)
        try {
          emailjs.init(window.emailjsConfig.publicKey);
        } catch (initErr) {
          // ignore init error and try send API below
        }
        var templateParams = {
          from_name: name,
          from_email: email,
          phone: phoneClean,
          message: message,
        };
        await emailjs.send(
          window.emailjsConfig.serviceId,
          window.emailjsConfig.templateId,
          templateParams,
        );
        statusEl &&
          (statusEl.textContent = "Mesaj trimis. Vă contactăm în curând.");
        form.reset();
      } else {
        // fallback to server POST (existing endpoint)
        var response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name,
            phone: phoneClean,
            email: email,
            message: message,
          }),
        });
        var data = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          throw new Error(data.error || "Nu am putut trimite mesajul.");
        }
        statusEl &&
          (statusEl.textContent = "Mesaj trimis. Vă contactăm în curând.");
        form.reset();
      }
    } catch (error) {
      statusEl &&
        (statusEl.textContent =
          (error && error.message) ||
          "Nu am putut trimite mesajul. Verificați configurarea serverului.");
    } finally {
      submitButton && (submitButton.disabled = false);
    }
  });
}

// keep resize handler for form and other behaviors; no-op for nav now
window.addEventListener("resize", function () {});

// Export placeholder for TS module compatibility
