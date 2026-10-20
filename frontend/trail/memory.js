/* The memory lane: the warm, personal end of the About page (after the black hole).
   EVERYTHING HERE IS A PLACEHOLDER TO EDIT. Change the words in MEMORY below and save; nothing else needs touching.
   - Pictures: put the file in frontend/assets/memory/ and write its name, e.g.  img: "../assets/memory/opening-day.jpg".
     Leave img empty ("") and a soft placeholder tile is shown instead.
   - Remove a whole item by deleting its { ... } line. Add one by copying a line.
   - Testimonials are SAMPLE text. Replace them only with real quotes the person agreed to share, or delete them. */
(function () {
  "use strict";
  var MEMORY = {
    intro: { kick: "Memory lane", title: "The people and moments<br>behind GR8", text: "A few pictures and stories from the way here. (Placeholder: write a short welcome in your own words.)" },

    /* A. gallery: pictures with a title, a caption and a date */
    gallery: [
      { img: "", title: "Opening day", caption: "Placeholder: who was there, what it felt like.", date: "YEAR" },
      { img: "", title: "Our first branch", caption: "Placeholder: where it was, what it looked like.", date: "YEAR" },
      { img: "", title: "The first loan released", caption: "Placeholder: a small story from that day.", date: "YEAR" },
      { img: "", title: "CALMS goes live", caption: "Placeholder: the day the system replaced paper.", date: "YEAR" },
      { img: "", title: "Team outing", caption: "Placeholder: a moment the team still talks about.", date: "YEAR" },
      { img: "", title: "A community day", caption: "Placeholder: an event you are proud of.", date: "YEAR" }
    ],

    /* B. accomplishments: a big figure and what it means */
    wins: [
      { big: "0,000", text: "Placeholder: loans released since the start" },
      { big: "00", text: "Placeholder: years serving the community" },
      { big: "0", text: "Placeholder: branches" },
      { big: "00%", text: "Placeholder: borrowers who came back for a second loan" }
    ],

    /* C. leadership: the CEO first, then others if you like */
    leaders: [
      { img: "", name: "Full Name", role: "Founder & Chief Executive Officer", bio: "Placeholder: two or three sentences about the CEO, their background and why they started GR8.",
        message: "Placeholder: a short personal message from the CEO to the people who borrow from GR8." }
    ],

    /* D. history: dates and what happened */
    timeline: [
      { date: "YEAR", title: "GR8 is founded", text: "Placeholder: where and by whom." },
      { date: "YEAR", title: "The first branch opens", text: "Placeholder: a line about it." },
      { date: "YEAR", title: "CALMS is built", text: "Placeholder: credit approval and loan management in one system." },
      { date: "YEAR", title: "Online applications", text: "Placeholder: borrowers can apply from home." },
      { date: "TODAY", title: "Still growing", text: "Placeholder: what comes next." }
    ],

    /* E. the development team behind CALMS and this website */
    team: [
      { img: "", name: "Full Name", role: "Role (e.g. Project lead)", text: "Placeholder: what they built." },
      { img: "", name: "Full Name", role: "Role (e.g. Back end)", text: "Placeholder: what they built." },
      { img: "", name: "Full Name", role: "Role (e.g. Front end & 3D)", text: "Placeholder: what they built." },
      { img: "", name: "Full Name", role: "Role (e.g. Database & QA)", text: "Placeholder: what they built." }
    ],

    /* F. testimonials: SAMPLE ONLY. Replace with real, permitted quotes or delete */
    sayings: [
      { quote: "Sample text: they showed me the full monthly amount before I signed anything.", who: "Sample name", what: "Salary loan borrower" },
      { quote: "Sample text: when I was late, they called me first instead of adding penalties right away.", who: "Sample name", what: "Personal loan borrower" },
      { quote: "Sample text: the papers were checked the same day, and I knew what was missing.", who: "Sample name", what: "SME loan borrower" }
    ],

    /* the end: how to reach GR8 */
    contact: {
      phone: "+63 900 000 0000", phoneNote: "Placeholder number. Call or text, Monday to Saturday, 8 AM to 5 PM",
      email: "hello@example.com", address: "Placeholder: street, barangay, city, province",
      social: [{ name: "Facebook", url: "#" }, { name: "Instagram", url: "#" }, { name: "TikTok", url: "#" }]
    }
  };

  var box = document.getElementById("memLane"); if (!box) return;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function initials(n) { return esc(String(n || "").split(/\s+/).map(function (w) { return w[0] || ""; }).join("").slice(0, 2).toUpperCase()); }
  function pic(img, label, cls) {
    return img ? '<img class="' + cls + '" src="' + esc(img) + '" alt="' + esc(label) + '" loading="lazy">'
      : '<div class="' + cls + ' ml-ph" role="img" aria-label="' + esc(label) + ' (photo placeholder)"><span>' + (cls === "ml-face" ? initials(label) : "Add a photo") + '</span></div>';
  }
  var M = MEMORY, h = [];
  h.push('<div class="ml-fade" aria-hidden="true"></div><div class="ml-in">');
  h.push('<header class="ml-head"><p class="ml-kick">' + esc(M.intro.kick) + '</p><h2 class="ml-h">' + M.intro.title + '</h2><p class="ml-lead">' + esc(M.intro.text) + '</p></header>');
  h.push('<section class="ml-sec" aria-label="Gallery"><p class="ml-kick">A · Gallery</p><div class="ml-gal">' + M.gallery.map(function (g, i) {
    return '<figure class="ml-photo" style="--r:' + ((i % 3) - 1) * 1.4 + 'deg">' + pic(g.img, g.title, "ml-img") + '<figcaption><b>' + esc(g.title) + '</b><span>' + esc(g.caption) + '</span><time>' + esc(g.date) + '</time></figcaption></figure>'; }).join("") + '</div></section>');
  h.push('<section class="ml-sec" aria-label="Accomplishments"><p class="ml-kick">B · What we have done</p><ul class="ml-wins">' + M.wins.map(function (w) {
    return '<li><b>' + esc(w.big) + '</b><span>' + esc(w.text) + '</span></li>'; }).join("") + '</ul></section>');
  h.push('<section class="ml-sec" aria-label="Leadership"><p class="ml-kick">C · Leadership</p>' + M.leaders.map(function (l) {
    return '<article class="ml-lead-card">' + pic(l.img, l.name, "ml-portrait") + '<div><h3>' + esc(l.name) + '</h3><p class="ml-role">' + esc(l.role) + '</p><p>' + esc(l.bio) + '</p><blockquote>' + esc(l.message) + '</blockquote></div></article>'; }).join("") + '</section>');
  h.push('<section class="ml-sec" aria-label="History"><p class="ml-kick">D · Our story</p><ol class="ml-time">' + M.timeline.map(function (t) {
    return '<li><time>' + esc(t.date) + '</time><div><b>' + esc(t.title) + '</b><span>' + esc(t.text) + '</span></div></li>'; }).join("") + '</ol></section>');
  h.push('<section class="ml-sec" aria-label="Development team"><p class="ml-kick">E · The team behind CALMS</p><div class="ml-team">' + M.team.map(function (t) {
    return '<article class="ml-mate">' + pic(t.img, t.name, "ml-face") + '<h3>' + esc(t.name) + '</h3><p class="ml-role">' + esc(t.role) + '</p><p>' + esc(t.text) + '</p></article>'; }).join("") + '</div></section>');
  if (M.sayings.length) h.push('<section class="ml-sec" aria-label="Testimonials"><p class="ml-kick">F · In their words <em class="ml-sample">Sample content, to be replaced</em></p><div class="ml-says">' + M.sayings.map(function (q) {
    return '<figure class="ml-say"><blockquote>“' + esc(q.quote) + '”</blockquote><figcaption><b>' + esc(q.who) + '</b> · ' + esc(q.what) + '</figcaption></figure>'; }).join("") + '</div></section>');
  var c = M.contact;
  h.push('<section class="ml-sec ml-contact" aria-label="Contact"><p class="ml-kick">Get in touch</p><a class="ml-phone" href="tel:' + esc(c.phone.replace(/[^\d+]/g, "")) + '">' + esc(c.phone) + '</a><p class="ml-note">' + esc(c.phoneNote) + '</p>' +
    '<dl class="ml-ways"><div><dt>Email</dt><dd><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></dd></div><div><dt>Visit</dt><dd>' + esc(c.address) + '</dd></div><div><dt>Follow</dt><dd>' +
    c.social.map(function (s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>'; }).join(" · ") + '</dd></div></dl>' +
    '<p class="ml-end"><a href="#talk" data-talk-ml>Let\'s talk <span>↳</span></a><a href="#" data-top>Back to the top <span>↑</span></a></p></section>');
  h.push('</div>');
  box.innerHTML = h.join("");
})();
