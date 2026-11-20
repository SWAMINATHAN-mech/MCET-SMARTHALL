// MCET Smart Hall & Venue — browser helpers (no libraries needed)

// 0) Glow + ripple on every clickable option -------------------------------------------
(function () {
  const SELECTOR = ".btn, .btn-outline, .chip, .nav a, .nav button, .tabs a, .role-switch a, .glowable, .slot, .fab, .tbl tr.click";
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(SELECTOR);
    if (!el || el.disabled) return;
    // ripple from the exact point that was clicked
    const host = el.tagName === "TR" ? el.firstElementChild : el;
    if (host && getComputedStyle(host).position !== "static") {
      const r = host.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const dot = document.createElement("span");
      dot.className = "ripple";
      dot.style.width = dot.style.height = size + "px";
      dot.style.left = e.clientX - r.left - size / 2 + "px";
      dot.style.top = e.clientY - r.top - size / 2 + "px";
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 650);
    }
    // glowing pulse
    el.classList.remove("glow-pulse");
    void el.offsetWidth; // restart the animation
    el.classList.add("glow-pulse");
    setTimeout(() => el.classList.remove("glow-pulse"), 750);
  });
})();

// 0b) 12-hour clock pickers: keep the hidden 24-hour "HH:MM" value in sync ---------------
const to12 = (hhmm) => {
  const h = Number(hhmm.slice(0, 2)), m = hhmm.slice(3, 5);
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
};
document.querySelectorAll("[data-time12]").forEach((box) => {
  const hidden = box.querySelector('input[type="hidden"]');
  const hSel = box.querySelector(".t-h"), mSel = box.querySelector(".t-m"), apSel = box.querySelector(".t-ap");
  const sync = () => {
    let h = Number(hSel.value) % 12;
    if (apSel.value === "PM") h += 12;
    hidden.value = `${String(h).padStart(2, "0")}:${mSel.value}`;
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
  };
  [hSel, mSel, apSel].forEach((s) => s.addEventListener("change", sync));
});

// 1) Availability grid: hover shows the 30-min slot, click requests it ------------------
document.querySelectorAll(".avail").forEach((grid) => {
  const kind = grid.dataset.kind;
  if (!kind) return;
  const start = Number(grid.dataset.start);
  const end = Number(grid.dataset.end);
  const date = grid.dataset.date;
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  grid.querySelectorAll(".vrow .track").forEach((track) => {
    const pick = document.createElement("span");
    pick.className = "slot-pick";
    track.appendChild(pick);
    const minuteAt = (e) => {
      const r = track.getBoundingClientRect();
      return Math.floor((start + ((e.clientX - r.left) / r.width) * (end - start)) / 30) * 30;
    };
    const isOpen = (m) => m >= toMin(track.dataset.open) && m < toMin(track.dataset.close);
    track.addEventListener("mousemove", (e) => {
      const m = minuteAt(e);
      if (e.target.closest(".slot") || !isOpen(m)) { pick.style.display = "none"; return; }
      pick.style.display = "block";
      pick.style.left = ((m - start) / (end - start)) * 100 + "%";
      pick.style.width = (30 / (end - start)) * 100 + "%";
      pick.title = `${to12(fmt(m))} – click to ${kind === "block" ? "block" : "request"}`;
    });
    track.addEventListener("mouseleave", () => (pick.style.display = "none"));
    track.addEventListener("click", (e) => {
      if (e.target.closest(".slot")) return; // clicked an existing booking
      const m = minuteAt(e);
      if (!isOpen(m)) return; // closed hours
      const qs = new URLSearchParams({ venue: track.dataset.venue, date, start: fmt(m), kind });
      location.href = `/request?${qs}`;
    });
  });
});

// 2) Request form: live availability check while the user types ---------------------
const form = document.getElementById("bookingForm");
if (form) {
  const CHECK_URL = form.dataset.checkUrl;
  const $ = (id) => document.getElementById(id);
  const verdict = $("verdict");
  const submit = $("submitBtn");
  const directRow = $("direct-row");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let timer;

  async function check() {
    const qs = new URLSearchParams({
      venue_id: $("f-venue").value,
      date: $("f-date").value,
      start: $("f-start").value,
      end: $("f-end").value,
      attendees: $("f-att") ? $("f-att").value : "1",
      kind: form.dataset.kind,
    });
    let data;
    try {
      data = await (await fetch(`${CHECK_URL}?${qs}`)).json();
    } catch {
      verdict.className = "verdict warn";
      verdict.textContent = "Could not check availability right now — you can still submit; the server will verify.";
      return;
    }
    $("f-facilities").textContent = data.facilities ? data.facilities.replaceAll(", ", " · ") : "";
    if (directRow) directRow.style.display = data.can_manage ? "flex" : "none";

    let html, cls;
    if (data.clashes.length) {
      cls = "bad";
      html = `⚠ <b>Not available.</b> ${data.clashes.map(esc).join("; ")}`;
    } else if (data.problems.length) {
      cls = "bad";
      html = `⚠ ${data.problems.map(esc).join(" ")}`;
    } else if (data.pending) {
      cls = "warn";
      html = `🕒 Free, but ${data.pending} other pending request${data.pending > 1 ? "s overlap" : " overlaps"} this slot.
              The supervisor will allot it to one request; the rest are declined automatically.`;
    } else {
      cls = "ok";
      html = `✔ <b>Available.</b> ${esc(data.venue)} is free for this time.`;
    }
    if (data.alternatives.length && cls !== "ok") {
      html += `<div class="mt-2 xs muted">Free at the same time and big enough:</div><div class="row mt-1" style="gap:.4rem">` +
        data.alternatives
          .map((a) => `<button type="button" class="chip" data-v="${a.id}">${esc(a.name)} · ${a.capacity}</button>`)
          .join("") + "</div>";
    }
    verdict.className = `verdict ${cls}`;
    verdict.innerHTML = html;
    submit.disabled = cls === "bad";
    verdict.querySelectorAll(".chip").forEach((c) =>
      c.addEventListener("click", () => {
        $("f-venue").value = c.dataset.v;
        check();
      }),
    );
  }

  ["f-venue", "f-date", "f-start", "f-end", "f-att"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(check, 250);
    });
    el.addEventListener("change", check);
  });
  check();
}
