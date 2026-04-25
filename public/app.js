// ── Teaser flow ───────────────────────────────────────────────────────────────

async function handleFile(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  if (file.size > 8 * 1024 * 1024) {
    showTeaserError('Bestand te groot. Maximaal 8 MB.');
    return;
  }

  const teaser = document.getElementById('teaser');
  const teaserCompany = document.getElementById('teaser-company');
  const teaserFound = document.getElementById('teaser-found');
  const teaserSub = document.getElementById('teaser-sub');
  const teaserLocked = document.getElementById('teaser-locked-text');
  const modalCopy = document.getElementById('modal-dynamic-copy');

  teaser.style.display = 'block';
  teaser.classList.remove('teaser--visible');
  teaserCompany.textContent = 'Analyseren...';
  teaserFound.textContent = '⏳ Even geduld...';
  teaserSub.textContent = 'Jouw brief wordt geanalyseerd.';
  setTimeout(() => teaser.classList.add('teaser--visible'), 10);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${WORKER_URL}/analyze`, { method: 'POST', body: formData });
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || 'Analyse mislukt');

    const sender = data.sender || null;
    const senderType = data.sender_type || null;
    const risk = data.risk || 'medium';
    const claimAmount = data.claim_amount || null;

    const riskLabel = { low: '🟡 Laag', medium: '🟠 Middel', high: '🟢 Hoog' }[risk] || risk;

    teaserCompany.textContent = sender || 'Brief herkend';
    teaserFound.textContent = 'Eerste bevinding:';

    let subText = 'Jouw incassobrief is geanalyseerd.';
    if (claimAmount) subText += ` Gevorderd bedrag: €${claimAmount}.`;
    if (senderType) subText += ` Type: ${senderType}.`;

    const riskMessages = {
      high: '🔴 Hoog aanvechtpotentieel — er lijken juridische fouten in deze brief te zitten.',
      medium: '🟠 Mogelijk aanvechtpunten gevonden — een volledige check is aan te raden.',
      low: '🟡 Laag risico — maar een check kan zekerheid geven.'
    };
    subText += ' ' + (riskMessages[risk] || '');
    teaserSub.textContent = subText;

    if (teaserLocked) {
      teaserLocked.innerHTML = `<strong>Volledige analyse na betaling</strong>
        Aanvechtpunten, inschatting en kant-en-klaar bezwaarschrift — uiterlijk morgen 16:00 per e-mail.`;
    }

    if (modalCopy) {
      modalCopy.textContent = sender
        ? `We hebben een brief van ${sender} herkend. De volledige beoordeling volgt na betaling.`
        : 'We hebben eerste aanwijzingen herkend. De volledige beoordeling volgt na betaling.';
    }

  } catch (err) {
    teaserCompany.textContent = 'Brief herkend';
    teaserFound.textContent = 'Klaar om te analyseren:';
    teaserSub.textContent = 'Klik hieronder om jouw volledige analyse en bezwaarschrift aan te vragen.';
    console.warn('Triage fout:', err.message);
  }

  teaser.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showTeaserError(msg) {
  const teaser = document.getElementById('teaser');
  if (teaser) {
    teaser.style.display = 'block';
    const sub = document.getElementById('teaser-sub');
    if (sub) sub.textContent = msg;
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal() {
  const modal = document.getElementById('modal');
  if (modal) { modal.classList.add('modal--open'); document.body.style.overflow = 'hidden'; }
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) { modal.classList.remove('modal--open'); document.body.style.overflow = ''; }
}

function closeModalOutside(event) {
  if (event.target === document.getElementById('modal')) closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── FAQ accordion ─────────────────────────────────────────────────────────────

function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const answer = item.querySelector('.faq-a');
  const chevron = item.querySelector('.faq-chevron');
  const isOpen = item.classList.contains('faq-item--open');

  document.querySelectorAll('.faq-item--open').forEach(openItem => {
    openItem.classList.remove('faq-item--open');
    const a = openItem.querySelector('.faq-a');
    const c = openItem.querySelector('.faq-chevron');
    if (a) a.style.maxHeight = null;
    if (c) c.style.transform = '';
  });

  if (!isOpen) {
    item.classList.add('faq-item--open');
    if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  }
}

// ── Sticky footer ─────────────────────────────────────────────────────────────

(function initStickyFooter() {
  const stickyFooter = document.getElementById('sticky-footer');
  if (!stickyFooter) return;
  let ticking = false;

  function updateSticky() {
    const scrollY = window.scrollY;
    const nearBottom = scrollY + window.innerHeight > document.documentElement.scrollHeight - 200;
    if (scrollY > 400 && !nearBottom) {
      stickyFooter.classList.add('sticky-footer--visible');
    } else {
      stickyFooter.classList.remove('sticky-footer--visible');
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateSticky); ticking = true; }
  }, { passive: true });
})();
