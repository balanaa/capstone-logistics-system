(() => {
  // Default config (labels)
  const DEFAULTS = {
    test1: {
      "REIMBURSABLE CHARGES": [
        "Handling Expenses"
      ],
      "ADVANCES (REFUNDABLE CHARGES)": [
        "Terminal Handling Charges",
        "AISL Container Clearance",
        "Wharfage",
        "Cargo Charges",
        "TABS Early Penalty Fee",
        "Manpower for Unloading"
      ],
      "FACILITATION EXPENSES": [
        "Incidental Expenses"
      ]
    },
    test2: {
      "SERVICE CHARGES": [
        "Brokerage Fee",
        { "Documentation & Processing": ["Processing Charges"] },
        "Hauling Charges"
      ]
    }
  };

  // Helpers for formatting/parsing
  const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function formatToDisplay(num){
    if (!isFinite(num)) return "0.00";
    return nf.format(num);
  }
  function formatNoDecimalsForTyping(rawStr){
    // remove commas and leading zeros appropriately, but keep minus and dot if user is typing
    if (rawStr === '' || rawStr === '-' || rawStr === '.' || rawStr === '-.') return rawStr;
    let s = String(rawStr).replace(/,/g, '');
    // If it's a valid number, format with grouping but no forced decimals
    const n = Number(s);
    if (!isFinite(n)) return s;
    // Use Intl to format with up to 20 decimal places, but then strip trailing zeros after decimal
    const parts = s.split('.');
    if (parts.length === 1) {
      // integer - format with grouping
      return Number(parts[0]).toLocaleString('en-US');
    } else {
      // has decimal part, keep decimal portion as typed (but do not insert commas into decimal part)
      const intPart = Number(parts.shift()).toLocaleString('en-US');
      const decPart = parts.join('').slice(0, 12); // limit long decimals while typing
      return intPart + '.' + decPart;
    }
  }
  function parseInputToNumber(str){
    if (!str) return 0;
    const cleaned = String(str).replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return 0;
    const n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }

  // Global store for withholding calculation sources
  const WITHHOLDING_SOURCES = [];

  // DOM utilities
  function $(sel, root=document){ return root.querySelector(sel); }
  function $$(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  // Small componentized utilities
  const DOM = {
    create(tag, opts={}){
      const el = document.createElement(tag);
      if(opts.className) el.className = opts.className;
      if(opts.text) el.textContent = opts.text;
      if(opts.html) el.innerHTML = opts.html;
      return el;
    }
  };

  // small helper to safely get text/value from an element
  function getElVal(el){
    if(!el) return '';
    if('value' in el) return el.value;
    return el.innerText || '';
  }

  // HTML escape helper (keeps your original)
  function escapeHtml(s){
    if(!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Create group DOM element (header, rows, add-area, summary)
  function createGroupElement(parentKey, groupKey, groupLabel){
    // group container
    const group = DOM.create('div', {className: 'group'});
    group.setAttribute('data-group', groupKey);

    // header with editable title and delete button
    const head = DOM.create('div', {className: 'group-head'});
    const title = DOM.create('h3', {text: groupLabel || groupKey});
    title.contentEditable = true;
    title.spellcheck = false;
    title.title = 'Click to edit group name';

    const ctrlWrap = DOM.create('div');
    // delete group button
    const delGroup = DOM.create('button', {text: 'Delete Group'});
    delGroup.className = 'del-group-btn';
    delGroup.addEventListener('click', () => {
      if(!confirm('Delete this group? This will remove all its rows.')) return;
      group.remove();
      refreshAllTotals();
    });

    ctrlWrap.appendChild(delGroup);
    head.appendChild(title);
    head.appendChild(ctrlWrap);

    // rows container
    const rows = DOM.create('div', {className: 'rows'});
    rows.setAttribute('data-rows', '');

    // add-area
    const addArea = DOM.create('div', {className: 'add-area'});

    // summary
    const summary = DOM.create('div', {className: 'summary'});
    summary.innerHTML = `<div class="label">Total — ${escapeHtml(groupLabel || groupKey)}</div><div class="value" data-total>0.00</div>`;

    group.appendChild(head);
    group.appendChild(rows);
    group.appendChild(addArea);
    group.appendChild(summary);

    // update summary label when header changes
    title.addEventListener('blur', ()=>{
      const lbl = summary.querySelector('.label');
      if (lbl) lbl.innerText = 'Total — ' + (title.innerText || groupKey);
    });

    return group;
  }

  // Create row
  function attachNumericBehavior(el){
    if(!el) return;
    el.type = 'text';
    el.inputMode = 'decimal';
    el.autocomplete = 'off';
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
    });
    el.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const text = (ev.clipboardData || window.clipboardData).getData('text') || '';
      let cleaned = text.replace(/[^0-9.\-]/g, '');
      if ((cleaned.match(/-/g) || []).length > 1) cleaned = cleaned.replace(/-/g, '');
      if (cleaned.includes('-') && cleaned.indexOf('-') > 0) cleaned = '-' + cleaned.replace(/-/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) cleaned = parts.shift() + '.' + parts.join('');
      el.value = cleaned;
    });
    el.addEventListener('input', () => {
      const caret = el.selectionStart || 0;
      const raw = el.value || '';
      let cleaned = raw.replace(/[^0-9.\-]/g, '');
      if ((cleaned.match(/-/g) || []).length > 1) cleaned = '-' + cleaned.replace(/-/g, '');
      if (cleaned.includes('-') && cleaned.indexOf('-') > 0) cleaned = '-' + cleaned.replace(/-/g, '');
      const dotIndex = cleaned.indexOf('.');
      if (dotIndex !== -1) {
        const left = cleaned.slice(0, dotIndex + 1);
        const right = cleaned.slice(dotIndex + 1).replace(/\./g, '');
        cleaned = left + right;
      }
      const result = formatWithCommasWhileTyping(cleaned, caret);
      if (result.value !== el.value) {
        el.value = result.value;
        try { el.selectionStart = el.selectionEnd = result.caret; } catch(e){}
      }
      refreshAllTotals();
    });
    el.addEventListener('focus', () => {
      const current = el.value || '';
      const cleaned = String(current).replace(/,/g, '');
      if (cleaned === '0' || cleaned === '0.00') { el.value = ''; return; }
      el.value = cleaned;
      setTimeout(()=>{ try{ el.selectionStart = el.selectionEnd = el.value.length; }catch(e){} },0);
    });
    el.addEventListener('blur', () => { el.value = formatToDisplay(parseInputToNumber(el.value)); refreshAllTotals(); });
  }

  function attachPercentBehavior(el, defaultPct){
    if(!el) return;
    el.type = 'text';
    el.classList.add('percent-input');
    el.value = (defaultPct !== undefined) ? (String(defaultPct) + '%') : '0%';
    el.addEventListener('input', () => {
      let raw = el.value.replace(/%/g, '').replace(/[^0-9.\-]/g, '');
      el.value = formatNoDecimalsForTyping(raw) + '%';
      refreshAllTotals();
    });
    el.addEventListener('blur', () => {
      const raw = el.value.replace(/%/g, '').replace(/[^0-9.\-]/g, '');
      const n = parseInputToNumber(raw);
      el.value = (isFinite(n) ? String(n) : '0') + '%';
      refreshAllTotals();
    });
    el.addEventListener('keydown', (ev) => { if(ev.key === 'Enter'){ ev.preventDefault(); el.blur(); } });
  }

  function createRow(labelText='New label', opts={}){
    const row = document.createElement('div');
    row.className = 'row';
    if (opts.isChild) row.classList.add('child-row');

    const delWrap = document.createElement('div'); delWrap.className = 'del-wrap';
    const delBtn = document.createElement('button'); delBtn.className = 'del'; delBtn.title='Delete row'; delBtn.innerText='×'; delBtn.tabIndex=-1; delWrap.appendChild(delBtn);

    const label = document.createElement('div'); label.className = 'label'; label.contentEditable = true; label.spellcheck=false; label.innerText = labelText; label.tabIndex = -1; label.title='Click to edit label';

    // right controls container (base and optional percent)
    const controls = document.createElement('div'); controls.className = 'right-controls';

    if (opts.withholdingParent){
      // percent input + base input
      const pct = document.createElement('input'); pct.className = 'percent-input withholding-percent';
      attachPercentBehavior(pct, opts.defaultPct !== undefined ? opts.defaultPct : 0);
      const base = document.createElement('input'); base.className = 'value withholding-base'; attachNumericBehavior(base);
      controls.appendChild(pct); controls.appendChild(base);
    } else if (opts.withholdingChild){
      const base = document.createElement('input'); base.className = 'value withholding-base'; attachNumericBehavior(base);
      controls.appendChild(base);
    } else {
      // default single value input
      const input = document.createElement('input'); input.className = 'value'; input.type='text'; attachNumericBehavior(input); controls.appendChild(input);
    }

  delBtn.addEventListener('click', ()=>{ row.remove(); const groupElem = row.closest('.group'); placeAddButton(groupElem); scanWithholdingSources(); refreshAllTotals(); });

    row.appendChild(delWrap); row.appendChild(label); row.appendChild(controls);
    return row;
  }

  // Light formatting during typing (no heavy computation)
  function formatNoHeavy(raw) {
    if (!raw) return '';
    // keep minus if at start
    let s = String(raw);
    // remove commas
    s = s.replace(/,/g, '');
    // If the user typed just '-' or '.' or '-.' return it as-is
    if (s === '-' || s === '.' || s === '-.') return s;
    // Validate and normalize multiple dots/minus
    // ensure only one minus and at start
    if ((s.match(/-/g) || []).length > 1) {
      s = s.replace(/\-/g, '');
      s = '-' + s;
    }
    if (s.includes('-') && s.indexOf('-') > 0) {
      s = s.replace(/\-/g, '');
      s = '-' + s;
    }
    // ensure single dot
    const parts = s.split('.');
    const intPart = parts.shift() || '0';
    const decPart = parts.join(''); // merge any extra dots content but keep only first dot
    // format integer part with grouping but not force decimals
    let intNum = intPart;
    // handle leading minus
    let minus = '';
    if (intNum.startsWith('-')) {
      minus = '-';
      intNum = intNum.slice(1);
    }
    // remove leading zeros except single zero
    intNum = intNum.replace(/^0+(?=\d)/, '');
    if (intNum === '') intNum = '0';
    // format integer with grouping
    const intFormatted = Number(intNum).toLocaleString('en-US');
    if (decPart.length > 0) {
      return minus + intFormatted + '.' + decPart.slice(0, 12); // limit decimal typing length
    } else {
      return minus + intFormatted;
    }
  }

  // Place add button under rows (and if empty keep it under group header)
  function placeAddButton(groupElem){
    const addArea = groupElem.querySelector('.add-area');
    addArea.innerHTML = '';
    const addBtn = document.createElement('button');
    addBtn.className = 'add';
    addBtn.innerText = '+ Add';
    addBtn.style.background = 'var(--primary-color)';
    addBtn.style.color = 'white';
    addBtn.style.border = 'none';
    addBtn.style.padding = '8px 12px';
    addBtn.style.borderRadius = '8px';
    addBtn.style.cursor = 'pointer';
    addBtn.style.display = 'block';
    addBtn.style.width = '100%';
    addBtn.style.textAlign = 'center';

    addBtn.addEventListener('click', () => {
      const rows = groupElem.querySelector('.rows');
      const newRow = createRow('New label');
      rows.appendChild(newRow);
      // after adding, keep add below rows
      placeAddButton(groupElem);
      // focus the label for quick editing
      setTimeout(() => {
        const lab = newRow.querySelector('.label');
        if (lab) { lab.focus(); placeCaretAtEnd(lab); }
      }, 0);
    });

    addArea.appendChild(addBtn);
  }

  // Build initial UI from DEFAULTS
  function setupInitial(){
    // group elements references
    const parents = document.querySelectorAll('.parent');
    parents.forEach(p => {
      const pKey = p.getAttribute('data-parent');
      const groupsContainer = p.querySelector('[data-groups]');
      if(!groupsContainer) return;
      groupsContainer.innerHTML = '';
      const defs = DEFAULTS[pKey] || {};
      Object.keys(defs).forEach((gLabel, idx) => {
        // create a stable group key based on index
        const gk = 'group' + (idx + 1);
        const ge = createGroupElement(pKey, gk, gLabel);
        // populate rows (handle strings or object entries for nested children)
        defs[gLabel].forEach(item => {
          if (typeof item === 'string') {
            // Special-case: if we're in test2 (Service Invoice) mark rows for withholding
            if (pKey === 'test2' && String(item).toLowerCase().includes('brokerage')) {
              ge.querySelector('[data-rows]').appendChild(createRow(item, {withholdingParent:true, defaultPct:20}));
            } else if (pKey === 'test2' && String(item).toLowerCase().includes('hauling')) {
              ge.querySelector('[data-rows]').appendChild(createRow(item, {withholdingParent:true, defaultPct:2}));
            } else {
              ge.querySelector('[data-rows]').appendChild(createRow(item));
            }
          } else if (typeof item === 'object') {
            // item is like { "Documentation & Processing": ["Processing Charges"] }
            Object.keys(item).forEach(parentLabel => {
              // Documentation & Processing should be a withholdingParent with child base(s)
              if (pKey === 'test2' && parentLabel.toLowerCase().includes('documentation')){
                ge.querySelector('[data-rows]').appendChild(createRow(parentLabel, {withholdingParent:true, defaultPct:2}));
                (item[parentLabel] || []).forEach(child => {
                  ge.querySelector('[data-rows]').appendChild(createRow(child, {withholdingChild:true}));
                });
              } else {
                ge.querySelector('[data-rows]').appendChild(createRow(parentLabel));
                (item[parentLabel] || []).forEach(child => {
                  ge.querySelector('[data-rows]').appendChild(createRow(child, {isChild:true}));
                });
              }
            });
          }
        });
        groupsContainer.appendChild(ge);
        // place add button
        placeAddButton(ge);
      });

      // attach add-group button on parent
      const addGroupBtn = p.querySelector('[data-add-group]');
      if(addGroupBtn && !addGroupBtn.dataset._attached){
        addGroupBtn.addEventListener('click', ()=>{
          // For test1 show a dropdown of template groups available in DEFAULTS.test1
          if (pKey === 'test1') {
            const templates = Object.keys(DEFAULTS.test1 || {});
            const sel = document.createElement('select');
            const defaultOpt = document.createElement('option');
            defaultOpt.text = 'Select group to add...';
            defaultOpt.value = '';
            sel.appendChild(defaultOpt);
            templates.forEach(t => { const o = document.createElement('option'); o.value = t; o.text = t; sel.appendChild(o); });
            sel.addEventListener('change', ()=>{
              const chosen = sel.value;
              if (!chosen) return;
              const ge = createGroupElement(pKey, 'group' + (p.querySelectorAll('.group').length + 1), chosen);
              // populate with template items
              (DEFAULTS.test1[chosen] || []).forEach(item => {
                if (typeof item === 'string') ge.querySelector('[data-rows]').appendChild(createRow(item));
                else if (typeof item === 'object') Object.keys(item).forEach(k => { ge.querySelector('[data-rows]').appendChild(createRow(k)); (item[k]||[]).forEach(c=>ge.querySelector('[data-rows]').appendChild(createRow(c, {isChild:true}))); });
              });
              p.querySelector('[data-groups]').appendChild(ge);
              placeAddButton(ge);
              sel.remove();
              scanWithholdingSources();
              refreshAllTotals();
            });
            addGroupBtn.parentElement.appendChild(sel);
            sel.focus();
            return;
          }

          // default add behavior for other parents
          const existing = Array.from(p.querySelectorAll('.group')).map(g=>g.getAttribute('data-group'));
          let i = 4;
          while(existing.includes('group'+i)) i++;
          const newKey = 'group'+i;
          const newLabel = 'New Group';
          const ge = createGroupElement(p.getAttribute('data-parent'), newKey, newLabel);
          p.querySelector('[data-groups]').appendChild(ge);
          placeAddButton(ge);
          refreshAllTotals();
        });
        addGroupBtn.dataset._attached = '1';
      }
    });

    // initial totals set to 0.00 (already in DOM)
    refreshAllTotals();
    scanWithholdingSources();
  }

  // Scan DOM to find withholding percent/base pairs and register them
  function scanWithholdingSources(){
    WITHHOLDING_SOURCES.length = 0;
    // find parent rows that have percent inputs
    document.querySelectorAll('.group').forEach(group => {
      const rows = Array.from(group.querySelectorAll('.row'));
      for (let i=0;i<rows.length;i++){
        const r = rows[i];
        const pct = r.querySelector('.withholding-percent');
        const base = r.querySelector('.withholding-base');
        if (pct && base){
          WITHHOLDING_SOURCES.push({pctEl: pct, baseEl: base, childBases: []});
        }
      }
    });
    // also attach child bases to nearest preceding parent source in same group
    document.querySelectorAll('.group').forEach(group => {
      const rows = Array.from(group.querySelectorAll('.row'));
      let lastParent = null;
      rows.forEach(r=>{
        if (r.querySelector('.withholding-percent')){ lastParent = WITHHOLDING_SOURCES.find(s=>s.pctEl === r.querySelector('.withholding-percent')); }
        else if (r.querySelector('.withholding-base')){
          if (lastParent && !r.classList.contains('child-row')){
            // non-child base but without percent: ignore
          }
          if (lastParent && r.classList.contains('child-row')){
            lastParent.childBases.push(r.querySelector('.withholding-base'));
          }
        }
      });
    });
  }

  function computeWithholding(){
    let total = 0;
    WITHHOLDING_SOURCES.forEach(src => {
      const pct = parseInputToNumber((src.pctEl?.value || '').replace(/%/g, '')) / 100;
      const base = parseInputToNumber(src.baseEl?.value || '0');
      let sumBase = base;
      if (src.childBases && src.childBases.length) src.childBases.forEach(cb => sumBase += parseInputToNumber(cb.value || '0'));
      const amount = +(sumBase * pct);
      total += amount;
    });
    // Note: do not auto-write withholding here. Caller should decide whether to use auto calc or manual input.
    return total;
  }
  
  // caret helper for contenteditable
  function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined"
        && typeof document.createRange != "undefined") {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // Refresh totals for groups, parents, and grand (FIXED VERSION)
  function refreshAllTotals(){
    // Calculate group totals
    $$('.group').forEach(group => {
      let groupSum = 0;
      group.querySelectorAll('.row').forEach(row => {
        const valueInputs = row.querySelectorAll('.value');
        valueInputs.forEach(input => {
          groupSum += parseInputToNumber(input.value || '0');
        });
      });
      const totalEl = group.querySelector('[data-total]');
      if(totalEl) totalEl.innerText = formatToDisplay(groupSum);
    });

    // Calculate parent totals
    let p1Total = 0;
    const p1El = document.getElementById('parentTotal1');
    document.querySelector('[data-parent="test1"]')?.querySelectorAll('.group').forEach(g => {
      p1Total += parseInputToNumber(g.querySelector('[data-total]')?.innerText || '0');
    });
    if(p1El) p1El.innerText = formatToDisplay(p1Total);

    let p2Total = 0;
    const p2El = document.getElementById('parentTotal2');
    document.querySelector('[data-parent="test2"]')?.querySelectorAll('.group').forEach(g => {
      p2Total += parseInputToNumber(g.querySelector('[data-total]')?.innerText || '0');
    });
    if(p2El) p2El.innerText = formatToDisplay(p2Total);

    // Grand total
    const grandTotalEl = document.getElementById('grandTotal');
    if(grandTotalEl) grandTotalEl.innerText = formatToDisplay(p1Total + p2Total);

    // Decide VAT flow based on VATExemptCheck
    const vatExemptCheck = document.getElementById('VATExemptCheck');
    const vatExemptInput = document.getElementById('VATExempt');
    const vatableEl = document.getElementById('VATableSales');
    const vatEl = document.getElementById('VATValue');
    const totalVatIncEl = document.getElementById('TotalSales_VatInc');
    const lessVatEl = document.getElementById('Less_Vat');
    const amountNetEl = document.getElementById('Amount_NetOfVat');
    const addVatEl = document.getElementById('Add_VAT');
    const pctIn = document.getElementById('VATPercent');

    if (vatExemptCheck && vatExemptCheck.checked){
      // VAT exempt flow: copy Service Invoice total to VAT Exempt and to Total Sales.
      if (vatableEl) vatableEl.innerText = formatToDisplay(0);
      if (pctIn) pctIn.disabled = true;
      if (vatEl) vatEl.innerText = formatToDisplay(0);
      if (vatExemptInput) vatExemptInput.innerText = formatToDisplay(p2Total);
      if (totalVatIncEl) totalVatIncEl.innerText = formatToDisplay(p2Total);
      if (lessVatEl) lessVatEl.innerText = formatToDisplay(0);
      if (amountNetEl) amountNetEl.innerText = formatToDisplay(p2Total);
      if (addVatEl) addVatEl.innerText = formatToDisplay(0);
    } else {
      // Normal VAT flow: vatable is p2Total
      if (vatableEl) vatableEl.innerText = formatToDisplay(p2Total);
      if (pctIn) pctIn.disabled = false;

      // VAT percent input parsing
      let pct = 0;
      if (pctIn) {
        const pctRaw = (pctIn.value || '').replace(/[^\d.]/g, '');
        pct = Number(pctRaw) || 0;
      }

      // compute VAT (numeric)
      const vat = +(p2Total * (pct / 100));
      if (vatEl) vatEl.innerText = formatToDisplay(vat);

      const totalVatInc = p2Total + vat;
      if (totalVatIncEl) totalVatIncEl.innerText = formatToDisplay(totalVatInc);

      if (lessVatEl) lessVatEl.innerText = formatToDisplay(vat);
      if (amountNetEl) amountNetEl.innerText = formatToDisplay(p2Total);
      if (addVatEl) addVatEl.innerText = formatToDisplay(vat);
      // clear VATExempt input when not exempt
      if (vatExemptInput) vatExemptInput.innerText = formatToDisplay(0);
    }

    // Update tax calculations (Service Invoice)
    updateTaxBlock();
  }

  function resetToDefaults(){
    if(!confirm('Reset all data to defaults?')) return;
    setupInitial();

    const taxDefaults = {
      VATPercent: '12%',
      WithholdingTax: '0.00'
    };

    for (const [id, defVal] of Object.entries(taxDefaults)) {
      const el = document.getElementById(id);
      if (el) el.value = defVal;
    }

    // Recalculate totals & taxes after resetting
    refreshAllTotals();
  }

  // ----- Totals & Taxes update -----
  function updateTaxBlock(){
    const p2El = document.getElementById('parentTotal2');
    if(!p2El) return;

    const vatable = parseInputToNumber(p2El.innerText || '0');
    const vatableEl = document.getElementById('VATableSales');
    if(vatableEl) vatableEl.innerText = formatToDisplay(vatable);

    const pctIn = document.getElementById('VATPercent');
    let pct = 0;
    if (pctIn) {
      const pctRaw = (pctIn.value || '').replace(/[^\d.]/g, '');
      pct = Number(pctRaw) || 0;
    }

    const vat = +(vatable * (pct / 100));
    const vatEl = document.getElementById('VATValue');
    if(vatEl) vatEl.innerText = formatToDisplay(vat);

    const totalVatInc = vatable + vat;
    const totalVatIncEl = document.getElementById('TotalSales_VatInc');
    if(totalVatIncEl) totalVatIncEl.innerText = formatToDisplay(totalVatInc);

    const lessVatEl = document.getElementById('Less_Vat');
    if(lessVatEl) lessVatEl.innerText = formatToDisplay(vat);

    const amountNetEl = document.getElementById('Amount_NetOfVat');
    if(amountNetEl) amountNetEl.innerText = formatToDisplay(vatable);

    const addVatEl = document.getElementById('Add_VAT');
    if(addVatEl) addVatEl.innerText = formatToDisplay(vat);

    const wIn = document.getElementById('WithholdingTax');
    const wToggle = document.getElementById('WithholdingToggle');

    if(wIn && !wIn.dataset._listenerAdded){
      wIn.addEventListener('blur', ()=> {
        wIn.value = formatToDisplay(parseInputToNumber(wIn.value || '0'));
        updateTaxBlock();
      });
      wIn.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter'){ ev.preventDefault(); wIn.blur(); } });
      wIn.dataset._listenerAdded = '1';
    }

    const vzIn = document.getElementById('VATZeroRated');
    const veIn = document.getElementById('VATExempt');
    if(vzIn && !vzIn.dataset._listenerAdded){
      vzIn.addEventListener('blur', ()=> { vzIn.value = formatToDisplay(parseInputToNumber(vzIn.value||'0')); updateTaxBlock(); });
      vzIn.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter'){ ev.preventDefault(); vzIn.blur(); } });
      vzIn.dataset._listenerAdded = '1';
    }

    if(pctIn && !pctIn.dataset._listenerAdded){
      pctIn.addEventListener('input', () => {
        const caretPos = pctIn.selectionStart;
        const raw = pctIn.value.replace(/[^\d.]/g, '');
        let num = raw ? Number(raw.replace(/,/g, '')) : 0;

        const formatted = num.toLocaleString('en-US', {maximumFractionDigits: 2});
        pctIn.value = formatted + '%';

        pctIn.setSelectionRange(Math.min(caretPos, pctIn.value.length - 1), Math.min(caretPos, pctIn.value.length - 1));
      });

      pctIn.addEventListener('blur', () => {
        const raw = pctIn.value.replace(/[^\d.]/g, '');
        let num = raw ? Number(raw.replace(/,/g, '')) : 0;
        const formatted = num.toLocaleString('en-US', {maximumFractionDigits: 2});
        pctIn.value = formatted + '%';
        updateTaxBlock();
      });

      pctIn.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          pctIn.blur();
        }
      });

      pctIn.dataset._listenerAdded = '1';
    }

    const computedWithholding = computeWithholding();
    const useAuto = wToggle ? !!wToggle.checked : true;
    const withholding = useAuto ? computedWithholding : (wIn ? parseInputToNumber(wIn.value || '0') : 0);
    
    if (useAuto && wIn){ 
      wIn.value = formatToDisplay(computedWithholding); 
      wIn.disabled = true; 
    } else if (wIn) { 
      wIn.disabled = false; 
    }

    const totalAmountDue = totalVatInc - withholding;
    const totalDueEl = document.getElementById('TOTAL_AMOUNT_DUE');
    if(totalDueEl) totalDueEl.innerText = formatToDisplay(totalAmountDue);
  }

  // Export JSON
  function exportJSON(){
    const data = {};
    document.querySelectorAll('.parent').forEach(p => {
      const pKey = p.getAttribute('data-parent') || p.querySelector('h2')?.innerText || 'parent';
      data[pKey] = {};
      p.querySelectorAll('.group').forEach(g => {
        const gKey = g.getAttribute('data-group') || g.querySelector('h3')?.innerText || 'group';
        data[pKey][gKey] = [];
        Array.from(g.querySelectorAll('.row')).forEach(r => {
          const label = r.querySelector('.label')?.innerText || '';
          const value = parseInputToNumber(r.querySelector('.value')?.value || '');
          data[pKey][gKey].push({ label: label.trim(), value });
        });
      });
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summation-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Init
  setupInitial();

  // VAT Exempt checkbox handler
  const vatExemptCheck = document.getElementById('VATExemptCheck');
  if (vatExemptCheck){
    vatExemptCheck.addEventListener('change', ()=>{
      const ve = document.getElementById('VATExempt');
      const vatableEl = document.getElementById('VATableSales');
      const p2El = document.getElementById('parentTotal2');
      const pctIn = document.getElementById('VATPercent');
      if (vatExemptCheck.checked){
        const val = parseInputToNumber(p2El ? (p2El.innerText||'0') : '0');
        if (ve) ve.innerText = formatToDisplay(val);
        if (vatableEl) vatableEl.innerText = formatToDisplay(0);
        if (pctIn) pctIn.disabled = true;
      } else {
        if (ve) ve.innerText = formatToDisplay(0);
        if (pctIn) pctIn.disabled = false;
      }
      refreshAllTotals();
    });
  }

  // Withholding toggle
  const withToggle = document.getElementById('WithholdingToggle');
  function setWithholdingUI(enabled){
    document.querySelectorAll('.withholding-percent').forEach(el=>{
      el.style.display = enabled ? '' : 'none';
    });
    const wIn = document.getElementById('WithholdingTax');
    if (wIn) wIn.disabled = enabled;
    updateTaxBlock();
  }
  if (withToggle){
    withToggle.addEventListener('change', ()=>{ setWithholdingUI(!!withToggle.checked); });
    setWithholdingUI(!!withToggle.checked);
  }

  // Attach reset/export handlers
  document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
  document.getElementById('exportBtn').addEventListener('click', exportJSON);

  // Enter key on label moves to value
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('label')) {
      ev.preventDefault();
      const lab = document.activeElement;
      const row = lab.closest('.row');
      if (row) {
        const input = row.querySelector('.value');
        if (input) input.focus();
      }
    }
  });

  // Live formatting with comma grouping while typing
  function formatWithCommasWhileTyping(raw, caretPos) {
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return { value: raw, caret: caretPos };

    let nonCommaLeft = 0;
    for (let i = 0; i < Math.min(caretPos, raw.length); i++) {
      if (raw[i] !== ',') nonCommaLeft++;
    }

    let stripped = String(raw).replace(/,/g, '');
    const hasMinus = stripped.startsWith('-');
    if (hasMinus) stripped = stripped.slice(1);

    const hasDot = stripped.indexOf('.') !== -1;
    const parts = stripped.split('.');
    const intPart = parts.shift() || '0';
    const decPart = parts.join('');

    const intNumber = intPart === '' ? 0 : Number(intPart);
    const intFormatted = isFinite(intNumber) ? intNumber.toLocaleString('en-US') : intPart;

    let newVal;
    if (hasDot) {
      newVal = (hasMinus ? '-' : '') + intFormatted + (decPart ? ('.' + decPart) : '.');
    } else {
      newVal = (hasMinus ? '-' : '') + (decPart ? (intFormatted + '.' + decPart) : intFormatted);
    }

    let counted = 0;
    let newCaret = 0;
    for (let i = 0; i < newVal.length; i++) {
      if (newVal[i] !== ',') counted++;
      if (counted >= nonCommaLeft) {
        newCaret = i + 1;
        break;
      }
    }
    if (counted < nonCommaLeft) {
      newCaret = newVal.length;
    }

    return { value: newVal, caret: newCaret };
  }

  // Export to Word function
  function downloadParentAsDoc(parentKey, filename) {
    console.log('downloadParentAsDoc called:', parentKey, filename);

    let parentEl = document.querySelector(`[data-parent="${parentKey}"]`);
    if (!parentEl) {
      if (parentKey === 'test1') parentEl = document.getElementById('parent1') || document.querySelector('.parent#parent1') || document.querySelector('.parent');
      if (parentKey === 'test2') parentEl = document.getElementById('parent2') || document.querySelector('.parent#parent2');
      if (!parentEl) parentEl = document.getElementById(parentKey);
    }

    if (!parentEl) {
      console.error('Parent not found for key:', parentKey);
      return alert('Parent not found: ' + parentKey);
    }

    function getElVal(el) {
      if (!el) return '';
      if ('value' in el && el.value !== undefined && el.value !== null) return String(el.value);
      return String(el.innerText || el.textContent || '');
    }

    function escapeHtml(s) {
      return String(s || '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
    }

    let htmlRows = '';
    const groups = parentEl.querySelectorAll('.group');
    groups.forEach(group => {
      const groupTitle = group.querySelector('h3')?.innerText || '';
      htmlRows += `<tr><td colspan="2" style="background:#f0f0f0;padding:8px;"><strong>${escapeHtml(groupTitle)}</strong></td></tr>`;

      Array.from(group.querySelectorAll('.row')).forEach(r => {
        const label = (r.querySelector('.label')?.innerText || '').trim();
        const vEl = r.querySelector('.value');
        const value = getElVal(vEl);
        htmlRows += `<tr>
          <td style="padding:6px 8px; vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 8px; text-align:right; vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`;
      });

      const groupTotalEl = group.querySelector('[data-total]') || group.querySelector('.group-total') || group.querySelector('.summary .value');
      const groupTotal = getElVal(groupTotalEl) || '0.00';
      htmlRows += `<tr>
        <td style="padding:8px 8px; font-weight:700;">Group Total</td>
        <td style="padding:8px 8px; text-align:right; font-weight:700;">${escapeHtml(groupTotal)}</td>
      </tr>`;
    });

    const parentTotalId = (parentKey === 'test1') ? 'parentTotal1' : (parentKey === 'test2' ? 'parentTotal2' : null);
    const parentTotal = parentTotalId ? (document.getElementById(parentTotalId)?.innerText || '') : (parentEl.querySelector('.grand .value')?.innerText || '');

    const title = parentEl.querySelector('h2')?.innerText || parentKey;
    const now = new Date();
    const timestamp = now.toLocaleString();

    let html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; color: #222; }
            h1 { color: ${getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#005CAB'}; }
            h2 { margin-top:20px; }
            table { width:100%; border-collapse: collapse; margin-top:12px; }
            td { border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <div>Generated: ${escapeHtml(timestamp)}</div>
          <table>
            ${htmlRows}
            <tr>
              <td style="padding:10px; font-weight:900;">Parent Total</td>
              <td style="padding:10px; text-align:right; font-weight:900;">${escapeHtml(parentTotal || '0.00')}</td>
            </tr>
          </table>
    `;

    if (parentKey === 'test2') {
      const vatableSales = getElVal(document.getElementById('VATableSales') || document.querySelector('#VATableSales')) || '0.00';
      const vat = getElVal(document.getElementById('VATValue') || document.querySelector('#VATValue')) || '0.00';
      const zeroRated = getElVal(document.getElementById('VATZeroRated') || document.querySelector('#VATZeroRated')) || '0.00';
      const exempt = getElVal(document.getElementById('VATExempt') || document.querySelector('#VATExempt')) || '0.00';

      const totalVatInc = getElVal(document.getElementById('TotalSales_VatInc') || document.querySelector('#TotalSales_VatInc')) || '0.00';
      const lessVat = getElVal(document.getElementById('Less_Vat') || document.querySelector('#Less_Vat')) || '0.00';
      const netOfVat = getElVal(document.getElementById('Amount_NetOfVat') || document.querySelector('#Amount_NetOfVat')) || '0.00';
      const addVat = getElVal(document.getElementById('Add_VAT') || document.querySelector('#Add_VAT')) || '0.00';
      const withholding = getElVal(document.getElementById('WithholdingTax') || document.querySelector('#WithholdingTax')) || '0.00';
      const totalDue = getElVal(document.getElementById('TOTAL_AMOUNT_DUE') || document.querySelector('#TOTAL_AMOUNT_DUE')) || '0.00';

      html += `
        <h2>Taxes & Totals</h2>
        <table>
          <tr>
            <td style="vertical-align:top; width:50%;">
              <table style="width:100%; border-collapse: collapse;">
                <tr><td style="padding:6px 8px;">VATable Sales</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(vatableSales)}</td></tr>
                <tr><td style="padding:6px 8px;">VAT</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(vat)}</td></tr>
                <tr><td style="padding:6px 8px;">VAT Zero-Rated Sales</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(zeroRated)}</td></tr>
                <tr><td style="padding:6px 8px;">VAT Exempt Sales</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(exempt)}</td></tr>
              </table>
            </td>
            <td style="vertical-align:top; width:50%;">
              <table style="width:100%; border-collapse: collapse;">
                <tr><td style="padding:6px 8px;">Total Sales (Vat Inc.)</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(totalVatInc)}</td></tr>
                <tr><td style="padding:6px 8px;">Less: Vat</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(lessVat)}</td></tr>
                <tr><td style="padding:6px 8px;">Amount - Net of Vat</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(netOfVat)}</td></tr>
                <tr><td style="padding:6px 8px;">Add: VAT</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(addVat)}</td></tr>
                <tr><td style="padding:6px 8px;">Less: Withholding Tax</td><td style="padding:6px 8px; text-align:right;">${escapeHtml(withholding)}</td></tr>
                <tr><td style="padding:8px 8px; font-weight:800;">TOTAL AMOUNT DUE</td><td style="padding:8px 8px; text-align:right; font-weight:800;">${escapeHtml(totalDue)}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    }

    html += `</body></html>`;

    try {
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${parentKey}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      console.log('Export started:', filename);
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed: ' + err.message);
    }
  }

  window.downloadParentAsDoc = downloadParentAsDoc;

})();