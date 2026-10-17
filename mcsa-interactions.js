(() => {
  "use strict";

  function addTabs() {
    const buttons = [...document.querySelectorAll(".tab-button")];
    const panes = [...document.querySelectorAll(".tab-pane")];

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("aria-controls");
        buttons.forEach((item) => item.setAttribute("aria-selected", String(item === button)));
        panes.forEach((pane) => {
          const selected = pane.id === targetId;
          pane.classList.toggle("active", selected);
          pane.hidden = !selected;
        });
      });
    });

    panes.forEach((pane) => {
      pane.hidden = !pane.classList.contains("active");
    });
  }

  function addCardsAndTables() {
    const intro = document.querySelector("#tab-theory .theory > p");
    if (intro) {
      intro.classList.add("highlight-box");
    }

    document.querySelectorAll("#tab-theory ul").forEach((list) => {
      list.classList.add("cards-grid");
      list.querySelectorAll(":scope > li").forEach((item, index) => {
        item.classList.add("info-card");
        const icon = document.createElement("span");
        icon.className = "card-icon";
        icon.setAttribute("aria-hidden", "true");
        const iconElement = document.createElement("i");
        iconElement.className = index % 2 === 0 ? "fa-solid fa-server" : "fa-solid fa-network-wired";
        icon.append(iconElement);
        item.prepend(icon);
      });
    });

    document.querySelectorAll("table").forEach((table) => {
      const wrapper = document.createElement("div");
      wrapper.className = "table-wrapper";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.append(table);

      table.querySelectorAll("td, th").forEach((cell) => {
        if (/[A-Za-z0-9]/.test(cell.textContent)) {
          cell.classList.add("is-ltr");
        }

        const value = cell.textContent.trim();
        if (/^(نعم|Yes)$/i.test(value)) {
          cell.textContent = "";
          const badge = document.createElement("span");
          badge.className = "badge-yes";
          badge.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> نعم';
          cell.append(badge);
        } else if (/^(لأ|لا|No)$/i.test(value)) {
          cell.textContent = "";
          const badge = document.createElement("span");
          badge.className = "badge-no";
          badge.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i> لا';
          cell.append(badge);
        }
      });
    });

    document.querySelectorAll("#tab-practical ol").forEach((list) => list.classList.add("steps-list"));
    document.querySelectorAll("code").forEach((code) => code.classList.add("code-pill"));
    document.querySelectorAll("#tab-practical .steps-list li").forEach((item) => {
      const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) {
        if (!walker.currentNode.parentElement.closest("code, .code-pill")) {
          textNodes.push(walker.currentNode);
        }
      }

      const tokenPattern = /(?:[A-Z]:\\[^\s,;]+|(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?|[\w.-]+\.(?:local|com|net|org|xml|wim)|AD DS|DNS|DHCP|GPO|WDS|PXE|NTFS|SMB|iSCSI|WSUS|RADIUS|RRAS|FSRM|DFS|PowerShell|Hyper-V|VMware|Server Manager|Domain Controller|Windows Server)/gi;
      textNodes.forEach((textNode) => {
        const value = textNode.nodeValue;
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;
        while ((match = tokenPattern.exec(value)) !== null) {
          fragment.append(document.createTextNode(value.slice(lastIndex, match.index)));
          const pill = document.createElement("span");
          pill.className = "code-pill";
          pill.dir = "ltr";
          pill.textContent = match[0];
          fragment.append(pill);
          lastIndex = tokenPattern.lastIndex;
        }
        if (lastIndex > 0) {
          fragment.append(document.createTextNode(value.slice(lastIndex)));
          textNode.replaceWith(fragment);
        }
        tokenPattern.lastIndex = 0;
      });
    });
  }

  function highlightPowerShell(text) {
    return text.split("\n").map((line) => {
      const commentAt = line.search(/(^|\s)#/);
      const commandText = commentAt >= 0 ? line.slice(0, commentAt) : line;
      const commentText = commentAt >= 0 ? line.slice(commentAt) : "";
      const escaped = commandText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      const styled = escaped
        .replace(/\b[A-Z][a-zA-Z]+-[A-Za-z][\w-]*\b/g, '<span class="ps-cmdlet">$&</span>')
        .replace(/(^|\s)(-[A-Za-z][\w:.-]*)/g, '$1<span class="ps-parameter">$2</span>');
      const escapedComment = commentText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      return styled + (commentAt >= 0 ? `<span class="ps-comment">${escapedComment}</span>` : "");
    }).join("\n");
  }

  async function copyText(text, button) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement("textarea");
        field.value = text;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) {
          throw new Error("Clipboard copy command failed");
        }
      }
      button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> تم النسخ!';
    } catch (error) {
      button.innerHTML = '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> تعذر النسخ';
      console.error("Unable to copy PowerShell commands.", error);
    }
    button.disabled = true;
    window.setTimeout(() => {
      button.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i> نسخ الكود';
      button.disabled = false;
    }, 1800);
  }

  function addTerminals() {
    document.querySelectorAll("pre").forEach((pre) => {
      const wrapper = document.createElement("section");
      wrapper.className = "ps-terminal";
      wrapper.setAttribute("aria-label", "نافذة أوامر PowerShell");

      const source = pre.textContent;
      const isXml = /<\?xml|<unattend/i.test(source);
      const terminalName = isXml ? "Unattend XML" : "Windows PowerShell";
      const header = document.createElement("div");
      header.className = "ps-header";
      const terminalIcon = isXml ? "fa-file-code" : "fa-terminal";
      wrapper.setAttribute("aria-label", terminalName);
      header.innerHTML = `<span class="ps-title"><i class="fa-solid ${terminalIcon}" aria-hidden="true"></i> ${terminalName}</span>`;

      const button = document.createElement("button");
      button.className = "copy-btn";
      button.type = "button";
      button.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i> نسخ الكود';
      button.addEventListener("click", () => copyText(pre.textContent, button));
      header.append(button);

      pre.innerHTML = isXml
        ? source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        : highlightPowerShell(source);
      pre.setAttribute("dir", "ltr");
      const parent = pre.parentNode;
      parent.insertBefore(wrapper, pre);
      wrapper.append(header, pre);
    });
  }

  function addLessonSearch() {
    const search = document.querySelector("#lesson-search");
    if (!search) {
      return;
    }

    const cards = [...document.querySelectorAll(".lesson-card")];
    const groups = [...document.querySelectorAll(".lesson-group")];
    const count = document.querySelector("#lesson-count");
    const emptyResults = document.querySelector("#empty-results");

    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      let visibleCount = 0;

      groups.forEach((group) => {
        const groupCards = [...group.querySelectorAll(".lesson-card")];
        let visibleInGroup = 0;
        groupCards.forEach((card) => {
          const matches = `${card.textContent} ${card.dataset.search || ""}`.toLocaleLowerCase().includes(query);
          card.hidden = !matches;
          if (matches) {
            visibleCount += 1;
            visibleInGroup += 1;
          }
        });
        group.hidden = visibleInGroup === 0;
      });

      count.textContent = query ? `${visibleCount} من ${cards.length} درس` : `${cards.length} درساً`;
      emptyResults.hidden = visibleCount !== 0;
    });
  }

  addTabs();
  addCardsAndTables();
  addTerminals();
  addLessonSearch();
})();
