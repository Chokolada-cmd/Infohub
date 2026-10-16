/* eKasi — PDF toolkit (client-side processing via pdf-lib) */

(function () {
  "use strict";

  var wsTitle = document.getElementById("wsTitle");
  var wsBody  = document.getElementById("wsBody");
  var wsClose = document.getElementById("wsClose");

  var TOOL_TITLES = {
    merge:  "Merge PDFs",
    split:  "Split PDF",
    rotate: "Rotate PDF",
    create: "Create PDF",
    secure: "Secure PDF",
    unlock: "Unlock PDF",
    sign:   "Sign PDF",
    scan:   "Scan to PDF",
    word:   "PDF to Word",
  };

  var RENDERERS = {
    merge:  renderMerge,
    split:  renderSplit,
    rotate: renderRotate,
    create: renderCreate,
    secure: renderSecure,
    unlock: renderUnlock,
    sign:   renderSign,
    scan:   renderScan,
    word:   renderWord,
  };

  document.querySelectorAll(".tool").forEach(function (btn) {
    btn.addEventListener("click", function () { openTool(btn.dataset.tool); });
  });

  wsClose.addEventListener("click", function () {
    wsTitle.textContent = "Select a tool to begin";
    wsBody.innerHTML =
      '<p class="muted">Choose any tool above. Your documents never leave this device for editing tasks.</p>';
    wsClose.hidden = true;
  });

  function openTool(name) {
    if (!RENDERERS[name]) return;
    wsClose.hidden = false;
    wsTitle.textContent = TOOL_TITLES[name];
    wsBody.innerHTML = "";
    RENDERERS[name]();
  }

  /* ---------- Merge ---------- */
  function renderMerge() {
    wsBody.innerHTML =
      '<input type="file" id="files" accept="application/pdf" multiple />' +
      '<button class="btn btn-primary" id="go" style="width:100%">Merge and Download</button>';

    document.getElementById("go").onclick = async function () {
      var files = document.getElementById("files").files;
      if (files.length < 2) return alert("Select at least two PDF files.");

      var PDFDocument = PDFLib.PDFDocument;
      var merged = await PDFDocument.create();

      for (var i = 0; i < files.length; i++) {
        var bytes = await files[i].arrayBuffer();
        var doc = await PDFDocument.load(bytes);
        var pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(function (p) { merged.addPage(p); });
      }

      var out = await merged.save();
      download(out, "merged.pdf");
    };
  }

  /* ---------- Split ---------- */
  function renderSplit() {
    wsBody.innerHTML =
      '<input type="file" id="files" accept="application/pdf" />' +
      '<input type="text" id="range" placeholder="Pages (e.g. 1-3,5)" />' +
      '<button class="btn btn-primary" id="go" style="width:100%">Split and Download</button>';

    document.getElementById("go").onclick = async function () {
      var file = document.getElementById("files").files[0];
      if (!file) return alert("Choose a PDF file.");

      var range = parseRange(document.getElementById("range").value);
      if (!range.length) return alert("Enter a page range.");

      var PDFDocument = PDFLib.PDFDocument;
      var src = await PDFDocument.load(await file.arrayBuffer());
      var out = await PDFDocument.create();
      var pages = await out.copyPages(src, range.map(function (i) { return i - 1; }));
      pages.forEach(function (p) { out.addPage(p); });

      download(await out.save(), "split.pdf");
    };
  }

  /* ---------- Rotate ---------- */
  function renderRotate() {
    wsBody.innerHTML =
      '<input type="file" id="files" accept="application/pdf" />' +
      '<select id="deg">' +
        '<option value="90">90 degrees clockwise</option>' +
        '<option value="180">180 degrees</option>' +
        '<option value="270">90 degrees counter-clockwise</option>' +
      '</select>' +
      '<button class="btn btn-primary" id="go" style="width:100%">Rotate and Download</button>';

    document.getElementById("go").onclick = async function () {
      var file = document.getElementById("files").files[0];
      if (!file) return alert("Choose a PDF file.");

      var deg = parseInt(document.getElementById("deg").value, 10);
      var PDFDocument = PDFLib.PDFDocument;
      var degrees = PDFLib.degrees;
      var doc = await PDFDocument.load(await file.arrayBuffer());

      doc.getPages().forEach(function (p) { p.setRotation(degrees(deg)); });
      download(await doc.save(), "rotated.pdf");
    };
  }

  /* ---------- Create ---------- */
  function renderCreate() {
    wsBody.innerHTML =
      '<textarea id="txt" rows="6" placeholder="Type or paste text..."></textarea>' +
      '<button class="btn btn-primary" id="go" style="width:100%">Create PDF</button>';

    document.getElementById("go").onclick = async function () {
      var text = document.getElementById("txt").value.trim();
      if (!text) return alert("Type some text first.");

      var PDFDocument = PDFLib.PDFDocument;
      var StandardFonts = PDFLib.StandardFonts;
      var rgb = PDFLib.rgb;

      var doc = await PDFDocument.create();
      var font = await doc.embedFont(StandardFonts.Helvetica);
      var page = doc.addPage([595, 842]);
      var lines = wrapText(text, 80);
      var y = 800;

      lines.forEach(function (line) {
        page.drawText(line, { x: 50, y: y, size: 12, font: font, color: rgb(0.08, 0.18, 0.13) });
        y -= 18;
        if (y < 50) { page = doc.addPage([595, 842]); y = 800; }
      });

      download(await doc.save(), "document.pdf");
    };
  }

  /* ---------- Secure ---------- */
  function renderSecure() {
    wsBody.innerHTML =
      '<p class="muted">Password protection is handled server-side and will be enabled in the next release using pypdf.</p>';
  }

  /* ---------- Unlock ---------- */
  function renderUnlock() {
    wsBody.innerHTML =
      '<p class="muted">Decryption is handled server-side and will be enabled in the next release using pypdf.</p>';
  }

  /* ---------- Sign ---------- */
  function renderSign() {
    wsBody.innerHTML =
      '<input type="file" id="files" accept="application/pdf" />' +
      '<input type="text" id="name" placeholder="Type your full name" />' +
      '<button class="btn btn-primary" id="go" style="width:100%">Sign and Download</button>';

    document.getElementById("go").onclick = async function () {
      var file = document.getElementById("files").files[0];
      var name = document.getElementById("name").value.trim();
      if (!file || !name) return alert("Choose a PDF and enter your name.");

      var PDFDocument = PDFLib.PDFDocument;
      var StandardFonts = PDFLib.StandardFonts;
      var rgb = PDFLib.rgb;

      var doc = await PDFDocument.load(await file.arrayBuffer());
      var font = await doc.embedFont(StandardFonts.HelveticaOblique);
      var last = doc.getPages()[doc.getPageCount() - 1];

      last.drawText("Signed: " + name, {
        x: 50, y: 60, size: 12, font: font, color: rgb(0.04, 0.4, 0.28),
      });

      download(await doc.save(), "signed.pdf");
    };
  }

  /* ---------- Scan ---------- */
  function renderScan() {
    wsBody.innerHTML =
      '<input type="file" id="files" accept="image/*" capture="environment" multiple />' +
      '<button class="btn btn-primary" id="go" style="width:100%">Scan to PDF</button>';

    document.getElementById("go").onclick = async function () {
      var files = document.getElementById("files").files;
      if (!files.length) return alert("Take or choose at least one photo.");

      var PDFDocument = PDFLib.PDFDocument;
      var doc = await PDFDocument.create();

      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var bytes = await f.arrayBuffer();
        var isPng = f.type.indexOf("png") !== -1;
        var img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        var page = doc.addPage([595, 842]);
        var scale = Math.min(555 / img.width, 800 / img.height);
        page.drawImage(img, {
          x: 20, y: 20,
          width: img.width * scale,
          height: img.height * scale,
        });
      }

      download(await doc.save(), "scan.pdf");
    };
  }

  /* ---------- PDF to Word ---------- */
  function renderWord() {
    wsBody.innerHTML =
      '<input type="file" id="files" accept="application/pdf" />' +
      '<button class="btn btn-primary" id="go" style="width:100%">Convert to Word</button>' +
      '<p class="muted" style="margin-top:12px">Server-side conversion. Your file is processed securely and deleted after download.</p>';

    document.getElementById("go").onclick = async function () {
      var file = document.getElementById("files").files[0];
      if (!file) return alert("Choose a PDF file.");

      var fd = new FormData();
      fd.append("file", file);

      var res = await fetch("/api/convert/pdf-to-word", { method: "POST", body: fd });
      if (!res.ok) return alert("Conversion failed.");

      var blob = await res.blob();
      download(blob, "converted.docx");
    };
  }

  /* ---------- Helpers ---------- */
  function download(bytes, filename) {
    var blob = new Blob([bytes], { type: "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseRange(str) {
    var out = [];
    str.split(",").forEach(function (part) {
      part = part.trim();
      if (part.indexOf("-") !== -1) {
        var bounds = part.split("-").map(Number);
        for (var i = bounds[0]; i <= bounds[1]; i++) out.push(i);
      } else if (part) {
        out.push(Number(part));
      }
    });
    return out;
  }

  function wrapText(text, max) {
    var words = text.split(/\s+/);
    var lines = [];
    var line = "";
    words.forEach(function (w) {
      if ((line + w).length > max) {
        lines.push(line.trim());
        line = w + " ";
      } else {
        line += w + " ";
      }
    });
    if (line.trim()) lines.push(line.trim());
    return lines;
  }
})();